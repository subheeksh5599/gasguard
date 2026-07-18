import { useState, useEffect } from 'react'

export default function ConfigPanel({ gasGuard }) {
  const [threshold, setThreshold] = useState('')
  const [topUp, setTopUp] = useState('')
  const [walletAddr, setWalletAddr] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (gasGuard.config?.active) {
      setThreshold(String(gasGuard.config.threshold))
      setTopUp(String(gasGuard.config.topUpAmount))
      setSaved(true)
    }
  }, [gasGuard.config])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!threshold || !topUp || !walletAddr) return
    try {
      await gasGuard.setConfig(walletAddr, threshold, topUp)
      setSaved(true)
    } catch {
      // surfaced via gasGuard.error
    }
  }

  return (
    <div className="panel p-6 md:p-7 fade-up" style={{ '--d': '280ms' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-xl">
          Add wallet
          {saved && (
            <span className="ml-3 text-[11px] font-mono uppercase tracking-[0.15em] text-[#5E7A4E] align-middle">
              ● added
            </span>
          )}
        </h3>
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
          Watch a wallet
        </span>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Wallet address (0x…)"
            value={walletAddr}
            onChange={(e) => setWalletAddr(e.target.value)}
            className="field font-mono"
          />
          <div className="text-[12px] text-[#8B8578] mt-2">Wallet to monitor</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="field font-mono"
            />
            <div className="text-[12px] text-[#8B8578] mt-2">Min balance (MON)</div>
          </div>
          <div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.25"
              value={topUp}
              onChange={(e) => setTopUp(e.target.value)}
              className="field font-mono"
            />
            <div className="text-[12px] text-[#8B8578] mt-2">Top-up amount (MON)</div>
          </div>
        </div>
        <button
          type="submit"
          disabled={gasGuard.loading || !threshold || !topUp || !walletAddr}
          className="btn-outline w-full rounded-full py-3.5 text-[13px] uppercase tracking-[0.12em] disabled:opacity-40 disabled:pointer-events-none"
        >
          {gasGuard.loading ? 'Saving…' : 'Save configuration'}
        </button>
      </form>
      {gasGuard.error && (
        <div className="mt-4 text-[13px] text-[#C24A17] border border-[#C24A17]/25 rounded p-3 break-words">
          {gasGuard.error}
        </div>
      )}
    </div>
  )
}
