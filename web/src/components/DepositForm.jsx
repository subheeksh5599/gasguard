import { useState } from 'react'

export default function DepositForm({ gasGuard }) {
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState(null)

  const handleDeposit = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    try {
      const tx = await gasGuard.deposit(amount)
      setTxHash(tx.hash)
      setAmount('')
    } catch {
      // surfaced via gasGuard.error
    }
  }

  return (
    <div className="panel p-6 md:p-7 fade-up" style={{ '--d': '200ms' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-xl">Deposit</h3>
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
          Fund the tank
        </span>
      </div>
      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field font-mono"
          />
          <div className="text-[12px] text-[#8B8578] mt-2">Amount in MON</div>
        </div>
        <button
          type="submit"
          disabled={gasGuard.loading || !amount}
          className="btn-ink w-full rounded-full py-3.5 text-[13px] uppercase tracking-[0.12em] disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>{gasGuard.loading ? 'Depositing…' : 'Deposit MON'}</span>
        </button>
      </form>
      {gasGuard.error && (
        <div className="mt-4 text-[13px] text-[#C24A17] border border-[#C24A17]/25 rounded p-3 break-words">
          {gasGuard.error}
        </div>
      )}
      {txHash && (
        <div className="mt-4 text-[13px] text-[#5E7A4E] border border-[#5E7A4E]/25 rounded p-3 font-mono">
          Deposited — {txHash.slice(0, 10)}…
        </div>
      )}
    </div>
  )
}
