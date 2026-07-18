import { txUrl } from '../utils/contract'

export default function TxHistory({ gasGuard }) {
  const events = gasGuard.refuelEvents

  return (
    <div className="panel p-6 md:p-7 fade-up" style={{ '--d': '400ms' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-xl">Refuel history</h3>
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
          On-chain events
        </span>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-sm text-[#8B8578] text-center py-10 border border-dashed border-[#16140F]/15 rounded">
          No refuels yet. History appears here.
        </div>
      ) : (
        <div className="divide-y divide-[#16140F]/8">
          {events.map((evt, i) => (
            <a
              key={i}
              href={txUrl(evt.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="index-row flex items-center justify-between py-3.5 px-1 group"
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E7A4E]" />
                <span className="text-sm font-mono">+{evt.amount.toFixed(4)} MON</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-[#8B8578]">{timeAgo(evt.timestamp)}</span>
                <span className="text-[12px] text-[#8B8578] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  {evt.txHash.slice(0, 8)}… ↗
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function timeAgo(unixTimestamp) {
  const diff = Math.floor(Date.now() / 1000) - unixTimestamp
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
