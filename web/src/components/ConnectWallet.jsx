import { useState } from 'react'
import { shortenAddress } from '../utils/contract'

export default function ConnectWallet({ wallet, large }) {
  const [open, setOpen] = useState(false)

  if (wallet.address) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[13px] border border-[#16140F]/20 hover:border-[#16140F] transition-colors duration-300"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wallet.isMonad ? 'bg-[#5E7A4E]' : 'bg-[#C24A17] dot-pulse'
            }`}
          />
          <span className="font-mono">{shortenAddress(wallet.address)}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 panel p-2 shadow-xl z-50">
            <div className="px-3 py-2 text-[12px] font-mono uppercase tracking-[0.1em] text-[#8B8578]">
              {wallet.isMonad ? 'Monad Testnet' : 'Wrong network — switch to Monad'}
            </div>
            <button
              onClick={() => {
                wallet.disconnect()
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded text-sm text-[#C24A17] hover:bg-[#C24A17]/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={wallet.connect}
      disabled={wallet.connecting}
      className={`btn-ink rounded-full uppercase tracking-[0.12em] disabled:opacity-50 ${
        large ? 'px-9 py-4 text-sm' : 'px-5 py-2.5 text-[13px]'
      }`}
    >
      <span>{wallet.connecting ? 'Connecting…' : 'Connect wallet'}</span>
    </button>
  )
}
