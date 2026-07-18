import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'

const MONAD_TESTNET = {
  chainId: '0x279F',       // 10143
  chainIdDecimal: 10143,
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  symbol: 'MON',
  explorer: 'https://testnet.monadexplorer.com',
}

export function useWallet() {
  const [address, setAddress] = useState(null)
  const [balance, setBalance] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [connecting, setConnecting] = useState(false)

  // Read balance whenever address or provider changes
  const refreshBalance = useCallback(async () => {
    if (!provider || !address) return
    const bal = await provider.getBalance(address)
    setBalance(parseFloat(ethers.formatEther(bal)))
  }, [provider, address])

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        setAddress(accounts[0])
      }
    }

    const handleChainChanged = () => {
      window.location.reload()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  useEffect(() => {
    refreshBalance()
    const interval = setInterval(refreshBalance, 10_000)
    return () => clearInterval(interval)
  }, [refreshBalance])

  const connect = async () => {
    if (!window.ethereum) {
      alert('No wallet found. Install MetaMask or similar.')
      return
    }

    setConnecting(true)
    try {
      const prov = new ethers.BrowserProvider(window.ethereum)
      const accounts = await prov.send('eth_requestAccounts', [])
      const sig = await prov.getSigner()
      const { chainId: cid } = await prov.getNetwork()

      setProvider(prov)
      setSigner(sig)
      setAddress(accounts[0])
      setChainId(Number(cid))

      // Switch to Monad testnet if needed
      if (Number(cid) !== MONAD_TESTNET.chainIdDecimal) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_TESTNET.chainId }],
          })
        } catch (e) {
          if (e.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: MONAD_TESTNET.chainId,
                chainName: MONAD_TESTNET.name,
                rpcUrls: [MONAD_TESTNET.rpcUrl],
                nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                blockExplorerUrls: [MONAD_TESTNET.explorer],
              }],
            })
          }
        }
      }
    } catch (err) {
      console.error('Connection failed:', err)
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setBalance(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
  }

  const isMonad = chainId === MONAD_TESTNET.chainIdDecimal

  return {
    address,
    balance,
    provider,
    signer,
    chainId,
    isMonad,
    connecting,
    connect,
    disconnect,
    refreshBalance,
    MONAD_TESTNET,
  }
}
