import { useState } from 'react'
import { shortenAddress } from '../utils/contract'

export default function RefuelButton({ wallet, gasGuard }) {
  const [txHash, setTxHash] = useState(null)

  const wallets = gasGuard.watchedWallets || []
  const configuredCount = wallets.length
  const lowWallets = wallets.filter(w => w.needsRefuel)
  const canRefuelAny = lowWallets.length > 0

  const handleRefuel = async (watchedWallet) => {
    try {
      const tx = await gasGuard.refuel(watchedWallet)
      setTxHash(tx.hash)
    } catch {
      // surfaced via gasGuard.error
    }
  }

  const handleRefuelAll = async () => {
    try {
      const tx = await gasGuard.refuelAll()
      setTxHash(tx.hash)
    } catch {
      // surfaced via gasGuard.error
    }
  }

  if (configuredCount === 0) {
    return (
      <div className="panel p-6 text-center fade-up" style={{ '--d': '160ms' }}>
        <span className="text-sm text-[#8B8578]">
          Deposit MON and set a threshold below to arm the refuel.
        </span>
      </div>
    )
  }

  if (!canRefuelAny) {
    return (
      <div className="panel p-6 fade-up flex items-center justify-between gap-4 flex-wrap" style={{ '--d': '160ms' }}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#5E7A4E]" />
          <span className="text-sm">All wallets above threshold. You're covered.</span>
        </div>
        <span className="text-[12px] font-mono text-[#8B8578]">
          {configuredCount} wallet{configuredCount !== 1 ? 's' : ''} configured
        </span>
      </div>
    )
  }

  // Show per-wallet refuel if only one is low
  if (lowWallets.length === 1) {
    const w = lowWallets[0]
    return (
      <div className="fade-up bg-[#16140F] text-[#F2EFE7] rounded p-6 md:p-7" style={{ '--d': '160ms' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#C24A17] dot-pulse" />
              <span className="text-sm font-medium">Low gas detected</span>
            </div>
            <div className="text-[13px] text-[#F2EFE7]/60 mt-2 font-mono">
              {shortenAddress(w.address)} · below {w.threshold} MON
            </div>
          </div>
          <button
            onClick={() => handleRefuel(w.address)}
            disabled={gasGuard.loading}
            className="bg-[#C24A17] hover:bg-[#D85A24] disabled:opacity-40 text-[#F2EFE7] px-7 py-3.5 rounded-full text-[13px] uppercase tracking-[0.12em] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            {gasGuard.loading ? 'Refueling…' : `Refuel +${w.topUpAmount} MON`}
          </button>
        </div>
        {gasGuard.error && (
          <div className="mt-4 text-[13px] text-[#F2A17E] border border-[#C24A17]/40 rounded p-3 break-words">
            {gasGuard.error}
          </div>
        )}
        {txHash && (
          <div className="mt-4 text-[13px] text-[#A8C69A] border border-[#5E7A4E]/40 rounded p-3 font-mono">
            Refueled — {txHash.slice(0, 10)}…
          </div>
        )}
      </div>
    )
  }

  // Multiple wallets are low — show refuel all + per-wallet
  return (
    <div className="fade-up bg-[#16140F] text-[#F2EFE7] rounded p-6 md:p-7" style={{ '--d': '160ms' }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#C24A17] dot-pulse" />
              <span className="text-sm font-medium">{lowWallets.length} wallets below threshold</span>
            </div>
            <div className="text-[13px] text-[#F2EFE7]/60 mt-2 font-mono">
              {lowWallets.map(w => shortenAddress(w.address)).join(', ')}
            </div>
          </div>
          <button
            onClick={handleRefuelAll}
            disabled={gasGuard.loading}
            className="bg-[#C24A17] hover:bg-[#D85A24] disabled:opacity-40 text-[#F2EFE7] px-7 py-3.5 rounded-full text-[13px] uppercase tracking-[0.12em] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
          >
            {gasGuard.loading ? 'Refueling…' : 'Refuel all'}
          </button>
        </div>

        <div className="space-y-2 pt-3 border-t border-[#F2EFE7]/10">
          {lowWallets.map((w, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="font-mono text-[12px] text-[#F2EFE7]/60 truncate">
                {shortenAddress(w.address)} · +{w.topUpAmount} MON
              </span>
              <button
                onClick={() => handleRefuel(w.address)}
                disabled={gasGuard.loading}
                className="text-[12px] uppercase tracking-[0.1em] text-[#C24A17] hover:text-[#D85A24]"
              >
                Refuel one
              </button>
            </div>
          ))}
        </div>
      </div>
      {gasGuard.error && (
        <div className="mt-4 text-[13px] text-[#F2A17E] border border-[#C24A17]/40 rounded p-3 break-words">
          {gasGuard.error}
        </div>
      )}
      {txHash && (
        <div className="mt-4 text-[13px] text-[#A8C69A] border border-[#5E7A4E]/40 rounded p-3 font-mono">
          Refueled — {txHash.slice(0, 10)}…
        </div>
      )}
    </div>
  )
}
