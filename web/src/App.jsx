import { useEffect, useRef, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Dashboard, { WatchedWallets } from './components/Dashboard'
import DepositForm from './components/DepositForm'
import ConfigPanel from './components/ConfigPanel'
import RefuelButton from './components/RefuelButton'
import WithdrawForm from './components/WithdrawForm'
import TxHistory from './components/TxHistory'
import { useWallet } from './hooks/useWallet'
import { useGasGuard } from './hooks/useGasGuard'

export default function App() {
  const [page, setPage] = useState('landing')
  const wallet = useWallet()
  const gasGuard = useGasGuard(wallet)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  if (page === 'dashboard') {
    return (
      <DashboardPage
        wallet={wallet}
        gasGuard={gasGuard}
        onBack={() => setPage('landing')}
      />
    )
  }

  return <Landing onLaunch={() => setPage('dashboard')} />
}

/* ═══════════════════════════════════════════════════
   LANDING
   ═══════════════════════════════════════════════════ */

function Landing({ onLaunch }) {
  // Scroll-triggered reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('active')
        }),
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    document
      .querySelectorAll('.reveal, .reveal-line')
      .forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[#F2EFE7] text-[#16140F]">
      <Nav onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} />
      <Marquee />
      <Manifesto />
      <ProblemIndex />
      <HowItWorks />
      <Numbers />
      <ClosingCTA onLaunch={onLaunch} />
      <Footer />
    </div>
  )
}

/* ── Nav ────────────────────────────────────────── */
function Nav({ onLaunch }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'py-3 bg-[#F2EFE7]/90 backdrop-blur-sm border-b border-[#16140F]/10'
          : 'py-6 border-b border-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between">
        <a href="#" className="font-display text-xl tracking-tight">
          GasGuard<span className="text-[#C24A17]">.</span>
        </a>
        <div className="hidden md:flex items-center gap-10 text-[13px] uppercase tracking-[0.15em] text-[#4A463C]">
          <a href="#manifesto" className="hover:text-[#16140F] transition-colors">Why</a>
          <a href="#problem" className="hover:text-[#16140F] transition-colors">Problem</a>
          <a href="#how" className="hover:text-[#16140F] transition-colors">How</a>
        </div>
        <button
          onClick={onLaunch}
          className="btn-ink px-5 py-2.5 rounded-full text-[13px] uppercase tracking-[0.12em]"
        >
          <span>Open App</span>
        </button>
      </div>
    </nav>
  )
}

/* ── Hero ───────────────────────────────────────── */
function Hero({ onLaunch }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (wrapRef.current && y < 900) {
        wrapRef.current.style.transform = `translateY(${y * 0.25}px)`
        wrapRef.current.style.opacity = String(Math.max(0, 1 - y / 700))
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-28 pb-16 overflow-hidden">
      <div ref={wrapRef} className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
        <div className="fade-up mb-8 flex items-center gap-3 text-[12px] font-mono uppercase tracking-[0.2em] text-[#8B8578]" style={{ '--d': '100ms' }}>
          <span className="w-8 h-px bg-[#8B8578]" />
          Monad Testnet — Chain 10143
        </div>

        <h1 className="font-display font-light leading-[0.95] tracking-[-0.02em] text-[clamp(3rem,9vw,8.5rem)]">
          <span className="mask-line" style={{ '--d': '150ms' }}>
            <span>Your wallet,</span>
          </span>
          <span className="mask-line" style={{ '--d': '280ms' }}>
            <span>
              never <em className="italic text-[#C24A17]">empty</em>
            </span>
          </span>
          <span className="mask-line" style={{ '--d': '410ms' }}>
            <span>again.</span>
          </span>
        </h1>

        <div className="mt-12 md:mt-16 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <p
            className="fade-up max-w-md text-base md:text-lg leading-relaxed text-[#4A463C]"
            style={{ '--d': '600ms' }}
          >
            A pre-paid gas reserve, held on-chain. Fund it once, set a
            threshold, and the moment your balance dips below the line —
            one transaction tops you back up. No faucet. No cooldown.
          </p>

          <div className="fade-up flex items-center gap-4" style={{ '--d': '720ms' }}>
            <button
              onClick={onLaunch}
              className="btn-ink px-8 py-4 rounded-full text-sm uppercase tracking-[0.12em]"
            >
              <span>Launch the app</span>
            </button>
            <a
              href="#how"
              className="btn-outline px-8 py-4 rounded-full text-sm uppercase tracking-[0.12em]"
            >
              How it works
            </a>
          </div>
        </div>
      </div>

      <div className="fade-up absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-mono uppercase tracking-[0.25em] text-[#8B8578]" style={{ '--d': '1000ms' }}>
        Scroll
      </div>
    </section>
  )
}

/* ── Marquee ────────────────────────────────────── */
function Marquee() {
  const items = ['Deposit', 'Configure', 'Monitor', 'Refuel']
  const row = [...items, ...items, ...items]
  return (
    <div className="border-y border-[#16140F]/10 py-5 overflow-hidden select-none">
      <div className="marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {row.map((word, i) => (
              <span
                key={`${half}-${i}`}
                className="flex items-center font-display text-2xl md:text-4xl font-light px-6 md:px-10 whitespace-nowrap"
              >
                {word}
                <span className="ml-12 md:ml-20 w-2 h-2 rounded-full bg-[#C24A17]" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Manifesto (word-by-word scroll light) ──────── */
function Manifesto() {
  const text =
    'Every builder knows the moment. The deploy is halfway through, the RPC is slow, and the transaction dies — out of gas. GasGuard turns "remember to top up" into an on-chain primitive so it never happens again.'
  const words = text.split(' ')
  const ref = useRef(null)
  const [lit, setLit] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.min(1, Math.max(0, (vh * 0.75 - rect.top) / (rect.height + vh * 0.25)))
      setLit(Math.floor(progress * words.length * 1.15))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [words.length])

  return (
    <section id="manifesto" className="py-32 md:py-48">
      <div className="max-w-[1000px] mx-auto px-6 md:px-10">
        <div className="text-[12px] font-mono uppercase tracking-[0.25em] text-[#8B8578] mb-10 reveal">
          (01) — Why this exists
        </div>
        <p
          ref={ref}
          className="font-display font-light text-[clamp(1.75rem,4.5vw,3.5rem)] leading-[1.25] tracking-[-0.01em]"
        >
          {words.map((w, i) => (
            <span key={i} className={`scroll-word ${i < lit ? 'lit' : ''}`}>
              {w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

/* ── Problem index (hover rows) ─────────────────── */
function ProblemIndex() {
  const rows = [
    ['Silent balance drain', 'You never notice you are low until the revert.'],
    ['Faucet cooldowns', 'Once you are empty, you wait. Faucets rate-limit.'],
    ['Context switching', 'Leaving the terminal to hunt a faucet kills flow.'],
    ['Shared team wallets', '"Can someone send me MON?" — every dev group chat.'],
    ['No safety net', 'No primitive keeps a wallet above a working balance.'],
  ]

  return (
    <section id="problem" className="py-24 md:py-36 border-t border-[#16140F]/10">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-4 text-[12px] font-mono uppercase tracking-[0.25em] text-[#8B8578] reveal">
            (02) — The problem
          </div>
          <h2 className="md:col-span-8 font-display font-light text-[clamp(2rem,5vw,4rem)] leading-[1.05] tracking-[-0.01em] reveal">
            Running out of gas is never a technical failure.
            <br />
            <em className="italic text-[#8B8578]">It's a workflow failure.</em>
          </h2>
        </div>

        <div>
          {rows.map(([title, sub], i) => (
            <div
              key={title}
              className="index-row reveal-line group flex items-baseline gap-6 md:gap-12 py-7 md:py-9 cursor-default"
              style={{ '--d': `${i * 80}ms` }}
            >
              <span className="font-mono text-[13px] text-[#8B8578] w-10 shrink-0">
                0{i + 1}
              </span>
              <div className="flex-1 flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
                <span className="font-display text-2xl md:text-4xl font-light tracking-[-0.01em]">
                  {title}
                </span>
                <span className="text-sm md:text-base text-[#8B8578] md:text-right md:max-w-sm">
                  {sub}
                </span>
              </div>
              <span className="row-arrow hidden md:block text-[#C24A17] text-2xl shrink-0">
                →
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── How it works ───────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Deposit',
      body: 'Fund your personal tank with MON. It lives in the contract, it stays yours, and you can withdraw the unused balance any time.',
      dark: false,
    },
    {
      n: '02',
      title: 'Configure',
      body: 'Pick the wallet to watch, a minimum balance threshold, and a top-up amount. The rules are stored and enforced on-chain.',
      dark: true,
    },
    {
      n: '03',
      title: 'Refuel',
      body: 'The moment the wallet dips below threshold, one call to checkAndRefuel releases the top-up. Anyone can trigger it — the contract enforces the rules.',
      dark: false,
      accent: true,
    },
  ]

  return (
    <section id="how" className="py-24 md:py-36 border-t border-[#16140F]/10 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 md:mb-24">
          <div>
            <div className="text-[12px] font-mono uppercase tracking-[0.25em] text-[#8B8578] mb-6 reveal">
              (03) — How it works
            </div>
            <h2 className="font-display font-light text-[clamp(2rem,5vw,4rem)] leading-[1.05] tracking-[-0.01em] reveal">
              Three moves.
              <br />
              <em className="italic">One contract.</em>
            </h2>
          </div>
          <p className="max-w-sm text-[#4A463C] leading-relaxed reveal">
            No keepers required, no trusted server, no admin keys. The
            threshold check runs inside the EVM at the moment of the call.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`tilt-card reveal rounded-md p-8 md:p-10 min-h-[380px] md:min-h-[440px] flex flex-col justify-between border ${
                s.dark
                  ? 'bg-[#16140F] text-[#F2EFE7] border-[#16140F]'
                  : s.accent
                  ? 'bg-[#C24A17] text-[#F2EFE7] border-[#C24A17]'
                  : 'bg-[#FBF9F3] border-[#16140F]/10'
              } ${i === 1 ? 'md:translate-y-10' : ''}`}
              style={{ '--d': `${i * 120}ms` }}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`font-mono text-[13px] ${
                    s.dark || s.accent ? 'text-[#F2EFE7]/50' : 'text-[#8B8578]'
                  }`}
                >
                  ({s.n})
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    s.accent ? 'bg-[#F2EFE7]' : 'bg-[#C24A17]'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-display font-light text-4xl md:text-5xl mb-5 tracking-[-0.01em]">
                  {s.title}
                </h3>
                <p
                  className={`leading-relaxed text-[15px] ${
                    s.dark || s.accent ? 'text-[#F2EFE7]/75' : 'text-[#4A463C]'
                  }`}
                >
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Numbers strip ──────────────────────────────── */
function Numbers() {
  const stats = [
    ['1', 'transaction to refuel'],
    ['16/16', 'Foundry tests passing'],
    ['0', 'admin keys or proxies'],
    ['10143', 'Monad testnet chain ID'],
  ]
  return (
    <section className="border-t border-[#16140F]/10">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-4">
        {stats.map(([n, label], i) => (
          <div
            key={label}
            className={`reveal py-12 md:py-16 px-2 md:px-8 ${
              i > 0 ? 'md:border-l border-[#16140F]/10' : ''
            } ${i % 2 === 1 ? 'border-l border-[#16140F]/10 md:border-l' : ''}`}
            style={{ '--d': `${i * 90}ms` }}
          >
            <div className="font-display font-light text-4xl md:text-6xl tracking-[-0.02em] mb-2">
              {n}
            </div>
            <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-[#8B8578]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Closing CTA ────────────────────────────────── */
function ClosingCTA({ onLaunch }) {
  return (
    <section className="py-32 md:py-48 border-t border-[#16140F]/10 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 text-center relative z-10">
        <h2 className="font-display font-light text-[clamp(2.5rem,7vw,6rem)] leading-[1.02] tracking-[-0.02em] reveal">
          Fill the tank once.
          <br />
          <em className="italic text-[#C24A17]">It saves you later.</em>
        </h2>
        <div className="mt-14 reveal" style={{ '--d': '200ms' }}>
          <button
            onClick={onLaunch}
            className="btn-ink px-10 py-5 rounded-full text-sm uppercase tracking-[0.14em]"
          >
            <span>Open the dashboard</span>
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[#16140F]/10 pt-16 pb-10 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-16">
          <div>
            <div className="font-display text-2xl mb-3">
              GasGuard<span className="text-[#C24A17]">.</span>
            </div>
            <p className="text-sm text-[#8B8578] max-w-xs leading-relaxed">
              Built for the Build Anything Hackathon on Monad. Contracts in
              Foundry, front end in React.
            </p>
          </div>
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
                Project
              </span>
              <a href="https://github.com/subheeksh5599/gasguard" target="_blank" rel="noopener noreferrer" className="hover:text-[#C24A17] transition-colors">GitHub</a>
              <a href="https://testnet.monadexplorer.com/address/0x91B96253D6D904f90709C5Ef58F66558455727E4" target="_blank" rel="noopener noreferrer" className="hover:text-[#C24A17] transition-colors">Contract</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8B8578]">
                Monad
              </span>
              <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-[#C24A17] transition-colors">Docs</a>
              <a href="https://testnet.monadexplorer.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C24A17] transition-colors">Explorer</a>
            </div>
          </div>
        </div>

        <div className="drift-word font-display font-light text-[clamp(4rem,16vw,15rem)] leading-[0.85] tracking-[-0.03em] text-center -mb-6 md:-mb-14">
          GASGUARD
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-2 pt-10 border-t border-[#16140F]/10 mt-6 text-[12px] font-mono uppercase tracking-[0.15em] text-[#8B8578]">
          <span>© 2026 GasGuard</span>
          <span>Monad Testnet · Chain 10143 · MIT</span>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════ */

function DashboardPage({ wallet, gasGuard, onBack }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('active')
        }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [wallet.address])

  return (
    <div className="min-h-screen bg-[#F2EFE7] text-[#16140F]">
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 bg-[#F2EFE7]/90 backdrop-blur-sm border-b border-[#16140F]/10">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-[13px] uppercase tracking-[0.12em] text-[#4A463C] hover:text-[#16140F] transition-colors"
          >
            <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
            Back
          </button>
          <span className="font-display text-lg">
            GasGuard<span className="text-[#C24A17]">.</span>
          </span>
          <ConnectWallet wallet={wallet} />
        </div>
      </nav>

      <main className="pt-32 pb-24">
        <div className="max-w-[1100px] mx-auto px-6">
          {!wallet.address ? (
            <div className="text-center py-24">
              <div className="fade-up text-[12px] font-mono uppercase tracking-[0.25em] text-[#8B8578] mb-6">
                Monad Testnet — Chain 10143
              </div>
              <h1 className="font-display font-light text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.02em] mb-6">
                <span className="mask-line" style={{ '--d': '100ms' }}>
                  <span>Your gas reserve,</span>
                </span>
                <span className="mask-line" style={{ '--d': '220ms' }}>
                  <span>
                    <em className="italic text-[#C24A17]">on-chain.</em>
                  </span>
                </span>
              </h1>
              <p className="fade-up text-[#4A463C] max-w-sm mx-auto mb-10 leading-relaxed" style={{ '--d': '400ms' }}>
                Connect a wallet on Monad testnet to fund your tank and set a
                refuel threshold.
              </p>
              <div className="fade-up flex justify-center" style={{ '--d': '520ms' }}>
                <ConnectWallet wallet={wallet} large />
              </div>
            </div>
          ) : (
            <>
              <header className="mb-12 fade-up">
                <div className="text-[12px] font-mono uppercase tracking-[0.25em] text-[#8B8578] mb-4">
                  Dashboard
                </div>
                <h1 className="font-display font-light text-4xl md:text-5xl tracking-[-0.02em]">
                  The tank<span className="text-[#C24A17]">.</span>
                </h1>
              </header>

              <div className="space-y-5">
                <Dashboard wallet={wallet} gasGuard={gasGuard} />
                <RefuelButton wallet={wallet} gasGuard={gasGuard} />
                <WatchedWallets gasGuard={gasGuard} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <DepositForm gasGuard={gasGuard} />
                  <ConfigPanel gasGuard={gasGuard} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <WithdrawForm gasGuard={gasGuard} />
                  <TxHistory gasGuard={gasGuard} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-[#16140F]/10 py-6">
        <div className="max-w-[1100px] mx-auto px-6 flex justify-between text-[11px] font-mono uppercase tracking-[0.15em] text-[#8B8578]">
          <span>GasGuard — pre-paid gas reserve</span>
          <span>Monad Testnet</span>
        </div>
      </footer>
    </div>
  )
}
