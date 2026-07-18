import { shortenAddress } from '../utils/contract'

export default function Dashboard({ wallet, gasGuard }) {
  const tankBal = gasGuard.tankBalance
  const walletBal = wallet.balance

  const configuredCount = gasGuard.watchedWallets?.length || 0
  const lowCount = gasGuard.watchedWallets?.filter(w => w.needsRefuel).length || 0

  const status = configuredCount > 0
    ? lowCount > 0
      ? `${lowCount} wallet${lowCount > 1 ? 's' : ''} low`
      : 'Protected'
    : 'Not configured'

  return (
    <div className="fade-up grid grid-cols-1 md:grid-cols-3 gap-5" style={{ '--d': '100ms' }}>
      <Card
        index="01"
        label="Wallet balance"
        value={walletBal !== null ? walletBal.toFixed(4) : '—'}
        unit="MON"
        sub={wallet.isMonad ? 'Monad Testnet' : 'Wrong network — switch to Monad'}
        warning={!wallet.isMonad}
      />
      <Card
        index="02"
        label="Tank balance"
        value={tankBal !== null ? tankBal.toFixed(4) : '—'}
        unit="MON"
        sub={`Watching ${configuredCount} wallet${configuredCount !== 1 ? 's' : ''}`}
        dark
      />
      <Card
        index="03"
        label="Status"
        value={status}
        sub={
          configuredCount > 0
            ? `${configuredCount} configured · ${lowCount} below threshold`
            : 'Deposit, then set a threshold below'
        }
        warning={lowCount > 0}
        ok={configuredCount > 0 && lowCount === 0}
      />
    </div>
  )
}

function Card({ index, label, value, unit, sub, dark, warning, ok }) {
  return (
    <div
      className={`panel p-6 md:p-7 transition-all duration-500 ${
        dark ? '!bg-[#16140F] !border-[#16140F] text-[#F2EFE7]' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-8">
        <span className={`text-[11px] font-mono uppercase tracking-[0.2em] ${dark ? 'text-[#F2EFE7]/50' : 'text-[#8B8578]'}`}>
          {label}
        </span>
        <span
          className={`w-2 h-2 rounded-full mt-1 ${
            warning
              ? 'bg-[#C24A17] dot-pulse'
              : ok
              ? 'bg-[#5E7A4E]'
              : dark
              ? 'bg-[#F2EFE7]/30'
              : 'bg-[#16140F]/20'
          }`}
        />
      </div>
      <div className="font-display font-light text-3xl md:text-4xl tracking-[-0.02em]">
        {value}
        {unit && (
          <span className={`text-base ml-2 font-mono ${dark ? 'text-[#F2EFE7]/50' : 'text-[#8B8578]'}`}>
            {unit}
          </span>
        )}
      </div>
      <div className={`text-[13px] mt-3 ${dark ? 'text-[#F2EFE7]/60' : warning ? 'text-[#C24A17]' : 'text-[#8B8578]'}`}>
        {sub}
      </div>
      <span className="sr-only">{index}</span>
    </div>
  )
}

export function WatchedWallets({ gasGuard }) {
  const wallets = gasGuard.watchedWallets || []

  if (wallets.length === 0) return null

  return (
    <div className="panel p-6 md:p-7 fade-up" style={{ '--d': '250ms' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-xl">Watched wallets</h3>
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
          {wallets.length} configured
        </span>
      </div>
      <div className="divide-y divide-[#16140F]/8">
        {wallets.map((w, i) => (
          <div key={i} className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${w.needsRefuel ? 'bg-[#C24A17] dot-pulse' : 'bg-[#5E7A4E]'}`} />
              <span className="font-mono text-sm truncate">{shortenAddress(w.address)}</span>
              <span className="text-[12px] text-[#8B8578] shrink-0">
                {w.needsRefuel ? 'Low' : 'OK'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#8B8578] shrink-0">
              <span>≥{w.threshold} MON</span>
              <span>+{w.topUpAmount} MON</span>
              <button
                onClick={() => gasGuard.removeWallet(w.address)}
                className="text-[#C24A17] hover:text-[#D85A24] font-mono uppercase tracking-[0.1em]"
                title="Remove wallet"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
