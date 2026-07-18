<div align="center">

<img src="screenshots/landing.png" alt="GasGuard — Pre-paid gas reserve for your wallet" width="100%" />

&nbsp;

[![Live demo](https://img.shields.io/badge/●_live-gasguard--two.vercel.app-C24A17)](https://gasguard-two.vercel.app)
[![Monad Testnet](https://img.shields.io/badge/⛽-Monad%20Testnet-7B3FE4)](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)
[![Contract](https://img.shields.io/badge/📜_MonadScan-GasGuard-14151a)](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)
[![License: MIT](https://img.shields.io/badge/license-MIT-C24A17.svg)](LICENSE)
![Tests](https://img.shields.io/badge/tests-24%20passing-3fb950)
![Stack](https://img.shields.io/badge/Solidity%20·%20React%2018%20·%20Vite%205-14151a)
![Monad](https://img.shields.io/badge/Monad-Testnet%2010143-C24A17)

### The pre-paid gas reserve for your wallet. Never run out of gas mid-deployment again.

GasGuard is a smart-contract fuel tank on Monad. Deposit MON into your personal tank, set a balance threshold for any wallet, and the moment it dips below — one transaction refuels it. Multi-wallet support means you can keep your deployer, CI bot, and teammate topped up from one tank. No faucet. No cooldown. No admin keys. The contract enforces the rules on-chain.

### ▶ Live now — deposit, configure, and refuel at **[gasguard-two.vercel.app](https://gasguard-two.vercel.app)**

**[ Live demo ↗ ](https://gasguard-two.vercel.app)** · **[ Contract on MonadScan ↗ ](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)** · **[ Architecture ↓ ](#architecture)** · **[ Run it locally ↓ ](#run-it-locally)** · **[ Keeper bot ↓ ](#4--keeper-bot)**

Built solo for the Spark hackathon. MIT licensed.

</div>

---

## Table of contents

- [See it in one command](#-see-it-in-one-command)
- [The problem](#the-problem)
- [How it works](#how-it-works)
  - [1 · Deposit](#1--deposit)
  - [2 · Configure](#2--configure)
  - [3 · Refuel](#3--refuel)
  - [4 · Keeper bot](#4--keeper-bot)
- [Architecture](#architecture)
  - [Transaction flow](#transaction-flow)
  - [Component by component](#component-by-component)
- [Safety, enforced on-chain](#safety-enforced-on-chain)
- [How it uses Monad](#how-it-uses-monad)
- [Engineering decisions](#engineering-decisions--the-hard-problems)
- [What's real vs pending — the honesty table](#whats-real-vs-pending--the-honesty-table)
- [Tests](#tests)
- [Run it locally](#run-it-locally)
- [Deploy](#deploy)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Roadmap](#roadmap)
- [License](#license)

---

## ▶ See it in one command

GasGuard is deployed on Monad Testnet at `0x89B230004eEf2115486F4C76529659D5a85D9397`. Every function is a `cast call` — read-only, no gas:

```bash
CONTRACT=0x89B230004eEf2115486F4C76529659D5a85D9397
RPC=https://testnet-rpc.monad.xyz

# Check tank balance
$ cast call $CONTRACT "tankBalance(address)(uint256)" \
    0x705B3D1D2Dc8c34941B20be6AB645F4aEC98bf25 --rpc-url $RPC
0

# Check if a wallet needs refuel
$ cast call $CONTRACT "needsRefuel(address,address)(bool)" \
    0x705B3D1D2Dc8c34941B20be6AB645F4aEC98bf25 \
    0x705B3D1D2Dc8c34941B20be6AB645F4aEC98bf25 --rpc-url $RPC
false

# List watched wallets for an owner
$ cast call $CONTRACT "getWallets(address)(address[])" \
    0x705B3D1D2Dc8c34941B20be6AB645F4aEC98bf25 --rpc-url $RPC
[]

# Get all configs for an owner (wallets + thresholds + topups + status)
$ cast call $CONTRACT "getAllConfigs(address)(address[],uint256[],uint256[],bool[],bool[])" \
    0x705B3D1D2Dc8c34941B20be6AB645F4aEC98bf25 --rpc-url $RPC
```

Every call is real, verifiable on Monad Testnet right now. The `cast call` output proves the contract is live and reads state correctly.

---

## The problem

You're deploying a contract to Monad testnet. The RPC is slow, you're rushing, and the transaction fails — out of gas. You forgot to check your balance. Now you're stuck waiting for a faucet cooldown while your flow evaporates.

| Problem | Impact |
|---------|--------|
| **Silent balance drain** | You never notice your wallet is low until a transaction reverts mid-deploy |
| **Faucet cooldowns** | Once you're empty, you wait — faucets rate-limit and testnet MON isn't instant |
| **Context switching** | Topping up means leaving your terminal, hunting for a faucet, losing your place |
| **Shared team wallets** | "Can someone send me testnet MON?" is the most repeated message in every dev group chat |
| **No safety net** | There is no on-chain primitive that automatically keeps a wallet above a working balance |
| **Manual, error-prone** | Watching balances by hand doesn't scale across the many wallets a builder juggles |

---

## How it works

Four capabilities, all enforced by the GasGuard contract on Monad Testnet. The contract is live at [0x89B230...](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397).

<img src="screenshots/dashboard.png" alt="GasGuard Dashboard — wallet balance, tank balance, watched wallets, refuel controls" width="100%" />

### 1 · Deposit

Fund your personal tank with MON via `deposit()` or a direct transfer. The balance lives in `tankBalance[yourAddress]` on-chain — it's yours, withdraw any unused amount any time. Every deposit emits a `Deposited(from, amount)` event, auditable on MonadScan.

### 2 · Configure

Add wallets to watch. Each gets its own threshold and top-up amount stored in `walletConfig[owner][wallet]` on-chain. The contract supports many wallets per tank — your deployer, your CI bot, your teammate's hot wallet. Rules are stored as a `Config` struct: `{threshold, topUpAmount, active}`. Only you can set configs for your tank. Removing a wallet is O(1) via swap-and-pop.

### 3 · Refuel

When a watched wallet drops below its threshold, anyone can call `checkAndRefuel(owner, wallet)`. The contract reads the wallet's balance on-chain (`_wallet.balance < cfg.threshold`), validates against the configured threshold, debits the tank, and sends the top-up in a single atomic transaction. If the wallet is above threshold — clean no-op, zero state change. If the tank is empty — revert with `InsufficientTankBalance`. `checkAndRefuelAll(owner)` refuels every below-threshold wallet in one transaction. Permissionless: anyone can trigger it, the EVM enforces the rules.

### 4 · Keeper bot

An optional Node.js script that polls the chain and auto-refuels. Set `WATCH_OWNERS` to a comma-separated list of tank owner addresses, set `PRIVATE_KEY` for a funded keeper wallet, and run `npm start`. The bot calls `getAllConfigs(owner)` to check every watched wallet, then fires `checkAndRefuelAll(owner)` for any owner with low wallets. Runs on a 30-second interval. Drop it on a $5 VPS, a cron job, or a Vercel cron.

```bash
cd keeper && npm install
PRIVATE_KEY=0x... WATCH_OWNERS=0x...,0x... POLL_INTERVAL_MS=30000 npm start
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      WEB APP (Vite + React)                  │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Connect  │  │ Dashboard │  │  Deposit │  │ Refuel     │ │
│  │ Wallet   │  │           │  │  + Config│  │ Button     │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                            │                                 │
│                      ethers.js v6                            │
└────────────────────────────┼─────────────────────────────────┘
                             │
                      Monad Testnet RPC
                      (Chain ID 10143)
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                       GASGUARD.SOL                           │
│                                                              │
│  Storage:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ tankBalance[address]                    → uint256       │ │
│  │ walletConfig[address][address]          → Config        │ │
│  │   Config { threshold, topUpAmount, active }             │ │
│  │ _watchedWallets[address]               → address[]      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Functions:                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ deposit()                 fund your tank with MON       │ │
│  │ setConfig(w, t, a)        add a wallet to watch         │ │
│  │ removeWallet(w)           stop watching one wallet      │ │
│  │ clearConfig()             stop watching all wallets     │ │
│  │ checkAndRefuel(o, w)      if w.balance < threshold      │ │
│  │                           → send topUp from tank        │ │
│  │ checkAndRefuelAll(o)      refuel all low wallets in 1tx │ │
│  │ withdraw(amount)          pull unused MON back          │ │
│  │ getWallets(o)             list watched wallets          │ │
│  │ getAllConfigs(o)          all configs + status in 1call │ │
│  │ needsRefuel(o, w)         view: would a refuel fire?    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Events: Deposited, Withdrawn, Refueled, ConfigSet,          │
│          WalletRemoved                                       │
└──────────────────────────────────────────────────────────────┘
```

### Transaction flow

1. **Connect wallet** on Monad Testnet (Chain ID 10143) via `window.ethereum`
2. **Deposit MON** — `deposit()` transfers MON to the contract, credits `tankBalance[msg.sender]`
3. **Add wallets** — `setConfig(wallet, threshold, topUpAmount)` stores rules in `walletConfig[owner][wallet]`
4. **Dashboard polls** every 10 seconds — reads `tankBalance`, `getAllConfigs`, and wallet balance via RPC
5. **Refuel fires** — `checkAndRefuel(owner, wallet)` reads wallet balance on-chain, validates against threshold, sends top-up atomically from owner's tank
6. **Or keeper bot** — polls every 30 seconds, calls `checkAndRefuelAll(owner)` for any owner with low wallets

### Component by component

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **GasGuard.sol** | Solidity 0.8.20 | Tank balances, wallet configs, threshold enforcement, refuel logic, withdrawals |
| **Dashboard** | React 18, Vite 5, Tailwind CSS 3 | Live wallet balance, tank balance, watched wallets table, deposit/config/refuel/withdraw forms |
| **Wallet connection** | ethers.js v6 + `window.ethereum` | Connect MetaMask/Rabby, detect Monad network, sign transactions |
| **useGasGuard hook** | React hooks | Contract reads every 10s, deposit/setConfig/refuel/withdraw calls, event loading |
| **Keeper bot** | Node.js, ethers.js v6 | Polls `getAllConfigs`, auto-fires `checkAndRefuelAll`, configurable interval |
| **Multi-chain deploy** | Foundry CREATE2 script | Deploy same bytecode to any EVM testnet with deterministic address |
| **Deployment** | Vercel (frontend), Foundry forge (contracts) | Static SPA on Vercel free tier, contract on Monad Testnet |

---

## Safety, enforced on-chain

Every claim maps to a mechanism in the contract, not a promise:

| Claim | How it's enforced |
|-------|------------------|
| Refuel only fires when wallet is genuinely below threshold | `_wallet.balance < cfg.threshold` — checked on-chain at call time, not cached off-chain |
| Funds only come from your own tank | `tankBalance[_owner] -= cfg.topUpAmount` — only the owner's tank is debited; nobody else's funds are touched |
| Top-up amount is capped by your config | `cfg.topUpAmount` is set by you in `setConfig()`, stored on-chain, immutable by callers |
| Nobody can drain your tank | `checkAndRefuel` only sends the configured `topUpAmount`, only to the wallet you configured, only when that wallet is below threshold |
| Tank balance is always withdrawable | `withdraw()` checks `tankBalance[msg.sender] >= _amount`, sends back to caller — no lockup, no timelock |
| No admin keys or upgradeability | Non-upgradeable, no `onlyOwner`, no proxy — there is nothing to compromise |
| Every failure returns a specific error | `NoTankBalance`, `NoConfigSet`, `InsufficientTankBalance`, `RefuelFailed`, `WithdrawFailed`, `ZeroAmount`, `WalletNotFound` — cheap, explicit reverts |

---

## How it uses Monad

**Reads.** The dashboard calls `tankBalance(owner)`, `getAllConfigs(owner)`, and `needsRefuel(owner, wallet)` — all view functions on Monad Testnet — every 10 seconds via ethers.js v6. These reads cost zero gas and require no signature. The contract re-reads `_wallet.balance` inside `checkAndRefuel` to prevent stale-state attacks.

**Writes.** Deposit, setConfig, checkAndRefuel, checkAndRefuelAll, and withdraw are standard Monad transactions. Each costs gas in MON. `checkAndRefuel` is permissionless — anyone with MON for gas can trigger a refuel for any configured owner. `checkAndRefuelAll` batches multiple refuels into one transaction.

**Verified on MonadScan.** The contract is live and queryable:
- GasGuard: [0x89B230004eEf2115486F4C76529659D5a85D9397](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)

---

## Engineering decisions & the hard problems

- **On-chain balance check, not off-chain cache.** `checkAndRefuel` reads `_wallet.balance` inside the transaction — not a cached value from the last dashboard poll. This prevents a race where the dashboard shows a low balance but the wallet was topped up between polls. The EVM guarantees the balance is current at execution time.

- **Permissionless refuel is intentional.** Anyone can call `checkAndRefuel(owner, wallet)` — not just the tank owner. This is the feature: a teammate sees you're low and tops you up, or a keeper bot polls and auto-refuels. The rules (whose tank, which wallet, how much) are enforced by the contract, so there's no trust issue.

- **checkAndRefuelAll batches without partial failure.** If any single wallet in the batch would exceed the tank balance, the entire transaction reverts. This is by design — you want to know your refuel failed, not silently skip wallets. In practice, keep your tank funded above the sum of all top-up amounts.

- **Multi-wallet uses swap-and-pop for O(1) removal.** `removeWallet(wallet)` swaps the target with the last element and pops the array. This keeps gas costs constant regardless of how many wallets you're watching. The `_walletIndex` mapping enables the O(1) lookup needed for the swap.

- **getAllConfigs returns everything in one call.** Instead of N+1 RPC calls (one per wallet), the frontend calls `getAllConfigs(owner)` which returns all wallets, thresholds, top-up amounts, active flags, and needsRefuel booleans in a single view call. This keeps the 10-second dashboard poll fast.

- **No trusted server, no API keys, no backend.** The frontend is a static SPA that talks directly to Monad RPC via ethers.js. There are no serverless functions, no API routes, no database. The contract is the backend. This eliminates an entire class of attack surface and means the app works as long as Monad RPC is up.

- **Keeper bot is optional and external.** The bot is a standalone Node.js script, not part of the contract or frontend. It doesn't hold anyone's private key except its own (for gas). It reads the same view functions as the dashboard and calls the same `checkAndRefuelAll` function. If the bot goes down, manual refuel still works. If it's compromised, the worst it can do is waste gas calling `checkAndRefuelAll` on wallets that are already above threshold (which is a no-op).

---

## What's real vs pending — the honesty table

| Capability | Status |
|------------|--------|
| **Deposit tank** — fund with MON via `deposit()` or direct transfer | **Real** — deployed on Monad, `Deposited` event emitted |
| **Threshold config** — set min balance + top-up per wallet | **Real** — `walletConfig[owner][wallet]`, viewable via `getConfig` |
| **One-click refuel** — `checkAndRefuel(owner, wallet)` | **Real** — permissionless, EVM-enforced, `Refueled` event emitted |
| **Multi-wallet** — one tank watches many wallets | **Real** — `getWallets()`, `getAllConfigs()`, `checkAndRefuelAll()` |
| **Withdraw** — pull unused MON back any time | **Real** — `withdraw()` with "Max" button in UI |
| **Dashboard** — live balance, tank, watched wallets, refuel controls | **Live** at gasguard-two.vercel.app |
| **Keeper bot** — auto-refuels low wallets every 30s | **Real code** — `keeper/bot.js`, needs a runner (not deployed) |
| **Multi-chain deploy** — CREATE2 script for 7 EVM testnets | **Real code** — `contracts/script/deploy-all.sh`, not executed |
| **Mainnet deployment** | **Roadmap** — testnet-verified, mainnet-ready |
| **External audit** | **Not done** — do not use with real funds |

---

## Tests

**24 forge tests** — all passing, all exercising the on-chain contract:

```bash
cd contracts && forge test -vvv
```

```
Ran 24 tests for test/GasGuard.t.sol:GasGuardTest
[PASS] test_Deposit_IncreasesTank
[PASS] test_Deposit_EmitsEvent
[PASS] test_Deposit_ZeroReverts
[PASS] test_Receive_Deposits
[PASS] test_SetConfig_RequiresTankBalance
[PASS] test_SetConfig_StoresConfig
[PASS] test_SetConfig_EmitsEvent
[PASS] test_MultiWallet_AddMultipleWallets
[PASS] test_RemoveWallet_RemovesFromList
[PASS] test_RemoveWallet_RevertsWhenNotFound
[PASS] test_RemoveWallet_EmitsEvent
[PASS] test_ClearConfig_RemovesAllWallets
[PASS] test_NeedsRefuel_FalseWithoutConfig
[PASS] test_NeedsRefuel_TrueWhenBelowThreshold
[PASS] test_CheckAndRefuel_RevertsWithoutConfig
[PASS] test_CheckAndRefuel_SendsWhenBelowThreshold
[PASS] test_CheckAndRefuel_NoopWhenAboveThreshold
[PASS] test_CheckAndRefuel_RevertsWhenTankTooLow
[PASS] test_CheckAndRefuelAll_RefuelsAllBelowThreshold
[PASS] test_CheckAndRefuelAll_SkipsAboveThreshold
[PASS] test_CheckAndRefuelAll_RevertsWhenTankTooLow
[PASS] test_GetAllConfigs_ReturnsAll
[PASS] test_Withdraw_ReducesTankAndPays
[PASS] test_Withdraw_RevertsWhenInsufficient

Suite result: ok. 24 passed; 0 failed; 0 skipped
```

| Test | What it proves |
|------|---------------|
| `test_Deposit_IncreasesTank` | `deposit()` credits the correct `tankBalance` |
| `test_Deposit_ZeroReverts` | Zero-value deposits revert with `ZeroAmount` |
| `test_SetConfig_RequiresTankBalance` | Cannot configure without first depositing |
| `test_MultiWallet_AddMultipleWallets` | One tank can watch and enumerate many wallets |
| `test_RemoveWallet_RemovesFromList` | `removeWallet()` uses swap-and-pop, array is consistent |
| `test_ClearConfig_RemovesAllWallets` | `clearConfig()` wipes all configs, tank balance untouched |
| `test_CheckAndRefuel_SendsWhenBelowThreshold` | Below-threshold wallet receives top-up from owner's tank |
| `test_CheckAndRefuel_NoopWhenAboveThreshold` | Above-threshold wallet → zero state change, no revert |
| `test_CheckAndRefuelAll_RefuelsAllBelowThreshold` | Batch refuel tops up every low wallet in one tx |
| `test_CheckAndRefuelAll_SkipsAboveThreshold` | Above-threshold wallets skipped, below-threshold refueled |
| `test_CheckAndRefuel_RevertsWhenTankTooLow` | `InsufficientTankBalance` revert when tank can't cover top-up |
| `test_Withdraw_ReducesTankAndPays` | `withdraw()` debits tank and sends MON to caller |
| `test_GetAllConfigs_ReturnsAll` | Single view call returns wallets, thresholds, top-ups, statuses |

---

## Run it locally

**Prerequisites:** Node.js 18+, Foundry (`curl -L https://foundry.paradigm.xyz | bash`).

```bash
git clone https://github.com/subheeksh5599/gasguard.git
cd gasguard

# Frontend
cd web && npm install && npm run dev   # → http://localhost:5173

# Contracts — build & test
cd ../contracts
forge build
forge test -vvv                         # 24 tests, all passing

# Deploy to Monad testnet
cp .env.example .env                    # fill in PRIVATE_KEY
source .env
forge script script/Deploy.s.sol --rpc-url $MONAD_RPC_URL --broadcast

# Set contract address in frontend
cd ../web
VITE_CONTRACT_ADDRESS=<deployed_address> npm run dev
```

## Deploy

| | |
|---|---|
| **Frontend** | **[gasguard-two.vercel.app](https://gasguard-two.vercel.app)** — Vercel |
| **GasGuard** | **[0x89B230...](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)** — Monad Testnet |

The frontend is a static SPA (Vite + React) deployed on Vercel's free tier. The contract is deployed on Monad Testnet (Chain ID 10143) via Foundry. Multi-chain deployment to any EVM testnet is scripted via CREATE2 — run `contracts/script/deploy-all.sh` with your private key.

## Project layout

```
gasguard/
├── contracts/                # Solidity (Foundry)
│   ├── src/GasGuard.sol       # Main contract (v2 multi-wallet)
│   ├── test/GasGuard.t.sol    # 24 tests (all passing)
│   ├── script/Deploy.s.sol    # Monad + multi-chain CREATE2 deploy
│   ├── script/deploy-all.sh   # Deploy to 7 EVM testnets
│   ├── foundry.toml
│   └── .env.example
├── web/                       # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx            # Landing (motion) + dashboard views
│   │   ├── components/        # ConnectWallet, Dashboard, WatchedWallets,
│   │   │                      #   DepositForm, ConfigPanel, RefuelButton,
│   │   │                      #   WithdrawForm, TxHistory
│   │   ├── hooks/             # useWallet, useGasGuard
│   │   ├── utils/contract.js  # ABI + address helpers (v2)
│   │   └── index.css          # Design system (Fraunces, Inter, Plex Mono)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── keeper/                    # Automation bot
│   ├── bot.js                 # Polls chain, auto-calls checkAndRefuelAll
│   ├── package.json
│   └── .env.example
├── screenshots/               # Landing + dashboard previews
├── vercel.json                # Vercel deployment config
├── README.md
└── .gitignore
```

## Tech stack

- **Smart Contract:** Solidity 0.8.20 + Foundry (forge, cast, anvil)
- **Frontend:** React 18, Vite 5, Tailwind CSS 3, ethers.js v6
- **Design:** Fraunces (display), Inter (body), IBM Plex Mono (data) — custom design system, no templates
- **Chain:** Monad Testnet (Chain ID 10143), MON native currency
- **Keeper Bot:** Node.js, ethers.js v6 — polls chain, auto-refuels
- **Deployment:** Vercel (frontend), Foundry script (contracts), CREATE2 (multi-chain)
- **Verification:** `forge test` — 24 tests, all passing; MonadScan for on-chain verification

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| **Phase 1** — Hackathon MVP | Deposit tank, threshold config, one-click refuel, live dashboard | ✅ Done |
| **Phase 2** — Automation | Keeper bot that calls `checkAndRefuelAll` when wallets drop below threshold | ✅ Done |
| **Phase 3** — Multi-wallet | Watch and refuel many wallets from one tank — one-click refuel all | ✅ Done |
| **Phase 4** — Multi-chain | CREATE2 deploy script for 7 EVM testnets (Sepolia, Base, Arbitrum, etc.) | ✅ Done |

## License

MIT — see [LICENSE](LICENSE).
