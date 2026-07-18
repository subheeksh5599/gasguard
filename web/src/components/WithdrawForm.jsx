import { useState } from 'react'

export default function WithdrawForm({ gasGuard }) {
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState(null)

  const handleWithdraw = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    try {
      const tx = await gasGuard.withdraw(amount)
      setTxHash(tx.hash)
      setAmount('')
    } catch {
      // surfaced via gasGuard.error
    }
  }

  const max = gasGuard.tankBalance

  return (
    <div className="panel p-6 md:p-7 fade-up" style={{ '--d': '340ms' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-xl">Withdraw</h3>
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
          Your MON, back
        </span>
      </div>
      <form onSubmit={handleWithdraw} className="space-y-4">
        <div>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.25"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field font-mono pr-16"
            />
            {max !== null && max > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(max))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono uppercase tracking-[0.1em] text-[#8B8578] hover:text-[#16140F] transition-colors"
              >
                Max
              </button>
            )}
          </div>
          <div className="text-[12px] text-[#8B8578] mt-2">
            {max !== null ? `${max.toFixed(4)} MON available in tank` : 'Amount in MON'}
          </div>
        </div>
        <button
          type="submit"
          disabled={gasGuard.loading || !amount}
          className="btn-outline w-full rounded-full py-3.5 text-[13px] uppercase tracking-[0.12em] disabled:opacity-40 disabled:pointer-events-none"
        >
          {gasGuard.loading ? 'Withdrawing…' : 'Withdraw MON'}
        </button>
      </form>
      {gasGuard.error && (
        <div className="mt-4 text-[13px] text-[#C24A17] border border-[#C24A17]/25 rounded p-3 break-words">
          {gasGuard.error}
        </div>
      )}
      {txHash && (
        <div className="mt-4 text-[13px] text-[#5E7A4E] border border-[#5E7A4E]/25 rounded p-3 font-mono">
          Withdrawn — {txHash.slice(0, 10)}…
        </div>
      )}
    </div>
  )
}
