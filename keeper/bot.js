import { ethers } from 'ethers'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x91B96253D6D904f90709C5Ef58F66558455727E4'
const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'
const PRIVATE_KEY = process.env.PRIVATE_KEY || ''
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10) // 30 seconds
const GAS_LIMIT = parseInt(process.env.GAS_LIMIT || '500000', 10)

// Wallets whose tanks the keeper monitors — comma-separated list
const WATCH_OWNERS = (process.env.WATCH_OWNERS || '')
  .split(',')
  .map(a => a.trim())
  .filter(Boolean)

const ABI = [
  'function getAllConfigs(address) view returns (address[] wallets, uint256[] thresholds, uint256[] topUpAmounts, bool[] actives, bool[] needsRefuels)',
  'function checkAndRefuelAll(address)',
]

// ─── Bot ──────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet)

async function poll() {
  const timestamp = new Date().toISOString()
  console.log(`\n[${timestamp}] Polling ${WATCH_OWNERS.length} owners...`)

  let refuels = 0
  let skipped = 0

  for (const owner of WATCH_OWNERS) {
    try {
      const configs = await contract.getAllConfigs(owner)

      // Count how many wallets need refuel
      const needsCount = configs.needsRefuels.filter(Boolean).length

      if (needsCount === 0) {
        skipped++
        continue
      }

      const walletList = configs.wallets
        .filter((_, i) => configs.needsRefuels[i])
        .map((addr, i) => {
          const idx = configs.needsRefuels.indexOf(true, i)
          return `${addr.slice(0, 6)}…${addr.slice(-4)}`
        })
        .slice(0, 5) // show max 5

      console.log(`  🔴 ${owner.slice(0, 6)}…${owner.slice(-4)}: ${needsCount} wallet(s) low → refueling`)
      console.log(`     Wallets: ${walletList.join(', ')}${needsCount > 5 ? ` +${needsCount - 5} more` : ''}`)

      const tx = await contract.checkAndRefuelAll(owner, { gasLimit: GAS_LIMIT })
      console.log(`     TX: ${tx.hash.slice(0, 10)}…`)
      await tx.wait()
      console.log(`     ✅ Refueled ${needsCount} wallet(s)`)
      refuels += needsCount

    } catch (err) {
      console.error(`  ❌ Error for ${owner.slice(0, 6)}…${owner.slice(-4)}: ${err.message}`)
    }
  }

  console.log(`  Done: ${refuels} refuels, ${skipped} owners skipped (above threshold)`)
}

async function main() {
  if (!PRIVATE_KEY) {
    console.error('Error: PRIVATE_KEY environment variable is required')
    process.exit(1)
  }

  if (WATCH_OWNERS.length === 0) {
    console.error('Error: WATCH_OWNERS environment variable is required (comma-separated addresses)')
    process.exit(1)
  }

  console.log('═══════════════════════════════════════════')
  console.log('  GasGuard Keeper Bot')
  console.log('═══════════════════════════════════════════')
  console.log(`  Contract:  ${CONTRACT_ADDRESS}`)
  console.log(`  RPC:       ${RPC_URL}`)
  console.log(`  Keeper:    ${wallet.address.slice(0, 10)}…`)
  console.log(`  Watching:  ${WATCH_OWNERS.length} owner(s)`)
  console.log(`  Interval:  ${POLL_INTERVAL_MS}ms`)
  console.log('═══════════════════════════════════════════')

  if (process.argv.includes('--once')) {
    console.log('\nRunning once (--once flag)')
    await poll()
    console.log('\nDone.')
    return
  }

  console.log('\nRunning in continuous mode. Press Ctrl+C to stop.\n')
  await poll()
  setInterval(poll, POLL_INTERVAL_MS)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
