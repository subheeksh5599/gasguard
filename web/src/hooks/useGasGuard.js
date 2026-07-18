import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../utils/contract'

export function useGasGuard(wallet) {
  const [tankBalance, setTankBalance] = useState(null)
  const [watchedWallets, setWatchedWallets] = useState([])
  const [refuelEvents, setRefuelEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const contract = wallet.signer ? getContract(wallet.signer) : null

  const refresh = useCallback(async () => {
    if (!contract || !wallet.address) return
    try {
      const [bal, configs] = await Promise.all([
        contract.tankBalance(wallet.address),
        contract.getAllConfigs(wallet.address),
      ])

      setTankBalance(parseFloat(ethers.formatEther(bal)))

      const wallets = configs.wallets.map((addr, i) => ({
        address: addr,
        threshold: parseFloat(ethers.formatEther(configs.thresholds[i])),
        topUpAmount: parseFloat(ethers.formatEther(configs.topUpAmounts[i])),
        active: configs.actives[i],
        needsRefuel: configs.needsRefuels[i],
      }))
      setWatchedWallets(wallets)
    } catch (err) {
      console.error('Refresh failed:', err)
    }
  }, [contract, wallet.address])

  // Fetch refuel events
  const loadEvents = useCallback(async () => {
    if (!contract || !wallet.address) return
    try {
      const filter = contract.filters.Refueled(wallet.address)
      const events = await contract.queryFilter(filter, -1000)
      const formatted = await Promise.all(
        events.reverse().slice(0, 10).map(async (evt) => {
          const block = await evt.getBlock()
          return {
            txHash: evt.transactionHash,
            amount: parseFloat(ethers.formatEther(evt.args.amount)),
            wallet: evt.args.wallet,
            timestamp: block.timestamp,
          }
        })
      )
      setRefuelEvents(formatted)
    } catch (err) {
      console.error('Event load failed:', err)
    }
  }, [contract, wallet.address])

  useEffect(() => {
    refresh()
    loadEvents()
    const interval = setInterval(refresh, 10_000)
    return () => clearInterval(interval)
  }, [refresh, loadEvents])

  const deposit = async (amountEth) => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.deposit({
        value: ethers.parseEther(amountEth),
      })
      await tx.wait()
      await refresh()
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const addWallet = async (watchedWallet, thresholdEth, topUpEth) => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.setConfig(
        watchedWallet,
        ethers.parseEther(thresholdEth),
        ethers.parseEther(topUpEth)
      )
      await tx.wait()
      await refresh()
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeWatchedWallet = async (walletAddr) => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.removeWallet(walletAddr)
      await tx.wait()
      await refresh()
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refuel = async (watchedWallet) => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.checkAndRefuel(wallet.address, watchedWallet)
      await tx.wait()
      await Promise.all([refresh(), wallet.refreshBalance(), loadEvents()])
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refuelAll = async () => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.checkAndRefuelAll(wallet.address)
      await tx.wait()
      await Promise.all([refresh(), wallet.refreshBalance(), loadEvents()])
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async (amountEth) => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const tx = await contract.withdraw(ethers.parseEther(amountEth))
      await tx.wait()
      await refresh()
      return tx
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    tankBalance,
    watchedWallets,
    refuelEvents,
    loading,
    error,
    deposit,
    addWallet,
    removeWallet: removeWatchedWallet,
    refuel,
    refuelAll,
    withdraw,
    refresh,
  }
}
