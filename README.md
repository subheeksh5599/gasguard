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

GasGuard is a smart-contract fuel tank on Monad. Pre-fund it once, set a balance threshold for any wallet, and when it dips below the line — one transaction tops it back up. No faucet. No cooldown. No lost momentum. Built for the Spark hackathon.

### ▶ Live at **[gasguard-two.vercel.app](https://gasguard-two.vercel.app)**

**[ Live demo ↗ ](https://gasguard-two.vercel.app)** · **[ Contract on MonadScan ↗ ](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397)** · **[ Architecture ↓ ](#architecture)** · **[ Run it locally ↓ ](#run-it-locally)**

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
- [Contracts](#contracts)
- [Safety, enforced on-chain](#safety-enforced-on-chain)
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

GasGuard is deployed on Monad Testnet. Every function is a `cast call` — verify it yourself:

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

# Deposit 0.5 MON into your tank
$ cast send $CONTRACT "deposit()" --value 0.5ether \
    --private-key <key> --rpc-url $RPC
# → Deposited event emitted on-chain
```

Every call is real, verifiable on Monad Testnet right now.

---

## The problem

You're deploying a contract to Monad testnet. The RPC is slow, you're rushing, and the transaction fails — out of gas. You forgot to check your balance. Now you're stuck waiting for a faucet cooldown while your flow evaporates. Every builder has hit this wall.

| Problem | Impact |
|---------|--------|
| **Silent balance drain** | You never notice your wallet is low until a transaction reverts mid-deploy |
| **Faucet cooldowns** | Once you're empty, you wait — faucets rate-limit and testnet MON isn't always instant |
| **Context switching** | Topping up means leaving your terminal, hunting for a faucet, and losing your place |
| **Shared team wallets** | "Can someone send me testnet MON?" is the most repeated message in every dev group chat |
| **No safety net** | There is no on-chain primitive that automatically keeps a wallet above a working balance |

---

## How it works

Four moves, one contract, zero trusted servers. The flow is enforced by the EVM at call time.

```
1. DEPOSIT ──> 2. CONFIGURE ──> 3. REFUEL ──> 4. KEEPER (optional)
   MON into        wallet to        balance < threshold   bot polls chain
   your tank       watch +                │               auto-refuels
                   threshold +     checkAndRefuel(wallet)  all low wallets
                   top-up amount           │
                                     tops up in 1 tx
```

### 1 · Deposit

Fund your personal tank with MON. The balance lives in `tankBalance[yourAddress]` — it's yours, withdrawable any time. Send MON directly to the contract or call `deposit()`.

### 2 · Configure

Add wallets to watch. Each gets its own threshold and top-up amount. One tank can watch many wallets — your deployer, your CI bot, your teammate's hot wallet. Rules are stored in `walletConfig[owner][wallet]` on-chain.

### 3 · Refuel

When a watched wallet drops below its threshold, anyone calls `checkAndRefuel(owner, wallet)`. The contract reads the wallet's balance on-chain, validates against the configured threshold, and sends the top-up in a single atomic transaction. If the wallet is above threshold — no-op. If the tank is empty — revert. No admin keys, no trusted server.

`checkAndRefuelAll(owner)` refuels every below-threshold wallet in one transaction — one click, all your wallets topped up.

### 4 · Keeper bot

An optional Node.js bot that polls the chain and auto-refuels. Set `WATCH_OWNERS` in `.env`, run `npm start`, and the bot calls `checkAndRefuelAll` whenever a wallet dips below threshold. Drop it on a $5 VPS or a cron job and forget about gas.

```bash
cd keeper
npm install
WATCH_OWNERS=0xYour,0xAddresses,0xHere npm start
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   WEB APP (Vite + React)                │
│                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│  │ Connect  │  │ Dashboard │  │  Deposit │  │ Refuel │ │
│  │ Wallet   │  │           │  │  + Config│  │ Button │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │              │            │      │
│       └──────────────┴──────────────┴────────────┘      │
│                          │                              │
│                    ethers.js v6                         │
└──────────────────────────┼──────────────────────────────┘
                           │
                    Monad Testnet RPC
                    (Chain ID 10143)
                           │
┌──────────────────────────┼──────────────────────────────┐
│                     GASGUARD.SOL                        │
│                                                         │
│  Storage:                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ tankBalance[owner]  → uint256 (per-user vault)   │  │
│  │ walletConfig[owner][wallet] → Config             │  │
│  │   {threshold, topUpAmount, active}               │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Functions:                                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ deposit()              fund your tank with MON    │  │
│  │ setConfig(w, t, a)     add wallet to watch        │  │
│  │ removeWallet(w)        stop watching a wallet     │  │
│  │ clearConfig()          stop watching all wallets  │  │
│  │ checkAndRefuel(o, w)   if w.balance < threshold   │  │
│  │                        → send topUp from tank     │  │
│  │ checkAndRefuelAll(o)   refuel all low wallets     │  │
│  │ withdraw(amount)       pull unused MON back       │  │
│  │ getWallets(o)          list watched wallets       │  │
│  │ getAllConfigs(o)       all configs in one call    │  │
│  │ needsRefuel(o, w)      would a refuel fire now?   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Events: Deposited, Withdrawn, Refueled, ConfigSet,     │
│          WalletRemoved                                  │
└──────────────────────────────────────────────────────────┘
```

### Transaction flow

1. **Connect wallet** on Monad Testnet (Chain ID 10143)
2. **Deposit MON** into your tank — `deposit()` transfers MON to the contract
3. **Add wallets** to watch — `setConfig(wallet, threshold, topUpAmount)` stores rules on-chain
4. **Dashboard polls** every 10 seconds — reads tank balance, wallet configs, and balance via RPC
5. **Refuel fires** — `checkAndRefuel(owner, wallet)` reads wallet balance on-chain, validates threshold, sends top-up atomically
6. **Or keeper bot** — polls every 30 seconds, calls `checkAndRefuelAll(owner)` for all below-threshold wallets

---

## Contracts

### Deployed on Monad Testnet

| Contract | Address |
|----------|---------|
| GasGuard | [`0x89B230004eEf2115486F4C76529659D5a85D9397`](https://testnet.monadexplorer.com/address/0x89B230004eEf2115486F4C76529659D5a85D9397) |

Chain ID `10143`. Native currency: MON.

### GasGuard.sol

```solidity
struct Config {
    uint256 threshold;   // minimum wallet balance before refuel is allowed
    uint256 topUpAmount; // how much MON to send per refuel
    bool active;
}

mapping(address => uint256) public tankBalance;                     // per-user vault
mapping(address => mapping(address => Config)) public walletConfig;  // owner => watchedWallet => config
```

| Function | Access | Description |
|----------|--------|-------------|
| `deposit()` | Public payable | Fund your tank with MON |
| `setConfig(wallet, threshold, topUpAmount)` | Public | Add or update a wallet to watch |
| `removeWallet(wallet)` | Public | Stop watching a single wallet |
| `clearConfig()` | Public | Remove all watched wallets; tank balance stays |
| `checkAndRefuel(owner, wallet)` | Public | If wallet balance < threshold, send topUp from tank |
| `checkAndRefuelAll(owner)` | Public | Refuel ALL below-threshold wallets in one tx |
| `withdraw(amount)` | Public | Pull unused MON back from your tank |
| `getConfig(owner, wallet)` | View | Return `(threshold, topUpAmount, active)` |
| `getWallets(owner)` | View | Return array of watched wallet addresses |
| `getWalletCount(owner)` | View | Return number of watched wallets |
| `getAllConfigs(owner)` | View | All wallets + configs + needsRefuel in one call |
| `needsRefuel(owner, wallet)` | View | Would a refuel fire right now? |

**Events:** `Deposited`, `Withdrawn`, `Refueled`, `ConfigSet`, `WalletRemoved`

---

## Safety, enforced on-chain

Every claim maps to code in the contract, not a promise:

| Claim | How it's enforced |
|-------|------------------|
| Refuel only fires when wallet is genuinely low | `_wallet.balance < cfg.threshold` — checked on-chain at call time, not cached |
| Funds only come from your own tank | `tankBalance[_owner] -= cfg.topUpAmount` — only the owner's tank is debited |
| Top-up amount is capped by your config | `cfg.topUpAmount` is set by you, stored on-chain, immutable by callers |
| Nobody can drain your tank | `checkAndRefuel` only sends the configured amount, only to the configured wallet |
| Tank balance is always withdrawable | `withdraw()` checks `tankBalance[msg.sender]`, sends back to caller — no lockup |
| No admin keys or proxies | Non-upgradeable, no `onlyOwner`, no proxy — nothing to compromise |
| Custom errors for every failure | `NoTankBalance`, `NoConfigSet`, `InsufficientTankBalance`, `RefuelFailed`, `WithdrawFailed`, `ZeroAmount`, `WalletNotFound` |

---

## What's real vs pending — the honesty table

| Capability | Status |
|------------|--------|
| **Deposit tank** — fund with MON via `deposit()` or direct transfer | **Real** — deployed on Monad testnet |
| **Threshold config** — set min balance + top-up per wallet | **Real** — stored in `walletConfig[owner][wallet]` |
| **One-click refuel** — `checkAndRefuel(owner, wallet)` | **Real** — anyone can call, EVM enforces rules |
| **Multi-wallet** — one tank watches many wallets | **Real** — `getWallets()`, `getAllConfigs()`, `checkAndRefuelAll()` |
| **Withdraw** — pull unused MON back any time | **Real** — `withdraw()` with "max" button in UI |
| **Dashboard** — live wallet balance, tank balance, watched wallets | **Live** at gasguard-two.vercel.app |
| **Keeper bot** — auto-refuels low wallets every 30s | **Real code** — `keeper/bot.js`, not deployed (needs a runner) |
| **Multi-chain deploy** — CREATE2 script for any EVM testnet | **Real code** — `contracts/script/deploy-all.sh`, not executed |
| **Mainnet deployment** | **Roadmap** — testnet-verified, mainnet-ready |
| **External audit** | **Not done** — don't use with real funds |

---

## Tests

**24 forge tests** — all passing, covering deposit, config, refuel, multi-wallet, withdraw, and edge cases:

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
| `test_Deposit_IncreasesTank` | `deposit()` credits the correct tank balance |
| `test_SetConfig_StoresConfig` | `setConfig()` stores threshold, top-up, active correctly |
| `test_MultiWallet_AddMultipleWallets` | One tank can watch and refuel many wallets |
| `test_RemoveWallet_RemovesFromList` | `removeWallet()` removes from array with swap-and-pop |
| `test_CheckAndRefuel_SendsWhenBelowThreshold` | Below-threshold wallet receives top-up in one tx |
| `test_CheckAndRefuel_NoopWhenAboveThreshold` | Above-threshold wallet is skipped with zero state change |
| `test_CheckAndRefuelAll_RefuelsAllBelowThreshold` | `checkAndRefuelAll()` tops up all low wallets |
| `test_CheckAndRefuelAll_SkipsAboveThreshold` | Above-threshold wallets are skipped in batch refuel |
| `test_Withdraw_ReducesTankAndPays` | `withdraw()` returns MON to caller |
| `test_CheckAndRefuel_RevertsWhenTankTooLow` | Insufficient tank balance → revert with `InsufficientTankBalance` |

---

## Run it locally

**Prerequisites:** Node.js 18+, Foundry (`curl -L https://foundry.paradigm.xyz | bash`)

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

The frontend is static (Vite SPA) deployed on Vercel's free tier. The contract is on Monad testnet. Multi-chain deployment to other EVM testnets is scripted via CREATE2 — run `contracts/script/deploy-all.sh` with your key.

## Project layout

```
gasguard/
├── contracts/                # Solidity (Foundry)
│   ├── src/GasGuard.sol       # Main contract (v2 multi-wallet)
│   ├── test/GasGuard.t.sol    # 24 tests (all passing)
│   ├── script/Deploy.s.sol    # Monad + multi-chain CREATE2 deploy
│   ├── script/deploy-all.sh   # Deploy to all testnets
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
│   ├── bot.js                 # Keeper: polls chain, auto-refuels
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
- **Design:** Fraunces (display), Inter (body), IBM Plex Mono (data) — custom, no templates
- **Chain:** Monad Testnet (Chain ID 10143), MON native currency
- **Keeper Bot:** Node.js, ethers.js v6 — polls chain, auto-refuels
- **Deployment:** Vercel (frontend), Foundry script (contracts), CREATE2 (multi-chain)

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| **Phase 1** — Hackathon MVP | Deposit tank, threshold config, one-click refuel, live dashboard | ✅ Done |
| **Phase 2** — Automation | Keeper bot that calls `checkAndRefuelAll` when wallets drop below threshold | ✅ Done |
| **Phase 3** — Multi-wallet | Watch and refuel many wallets from one tank — one-click refuel all | ✅ Done |
| **Phase 4** — Multi-chain | CREATE2 deploy script for any EVM testnet (Sepolia, Base, Arbitrum, etc.) | ✅ Done |

## License

MIT — see [LICENSE](LICENSE).
