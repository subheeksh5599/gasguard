#!/usr/bin/env bash
# Multi-chain deployment script for GasGuard
# Usage: ./deploy-all.sh [chain1,chain2,...]
# Deploys GasGuard to one or more EVM testnets using CREATE2.
# Contract address will be the same on every chain.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR"

# ─── Load env ──────────────────────────────────────────────

if [ -f "$CONTRACTS_DIR/.env" ]; then
  source "$CONTRACTS_DIR/.env"
fi

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: PRIVATE_KEY not set. Copy .env.example to .env and fill it in."
  exit 1
fi

# ─── Chain configs ─────────────────────────────────────────

declare -A CHAINS
CHAINS[monad_testnet]="https://testnet-rpc.monad.xyz|10143"
CHAINS[sepolia]="https://sepolia.gateway.tenderly.co|11155111"
CHAINS[base_sepolia]="https://sepolia.base.org|84532"
CHAINS[arbitrum_sepolia]="https://sepolia-rollup.arbitrum.io/rpc|421614"
CHAINS[optimism_sepolia]="https://sepolia.optimism.io|11155420"
CHAINS[polygon_amoy]="https://rpc-amoy.polygon.technology|80002"
CHAINS[blast_sepolia]="https://sepolia.blast.io|168587773"

# CREATE2 salt — change this to get a different address
# Keep the same to get the same address on all chains
SALT="${SALT:-42069101}"

# ─── Parse args ────────────────────────────────────────────

if [ $# -gt 0 ] && [ "$1" != "all" ]; then
  SELECTED=($(echo "$1" | tr ',' ' '))
else
  SELECTED=("${!CHAINS[@]}")
fi

echo "═══════════════════════════════════════════════"
echo "  GasGuard Multi-Chain Deploy"
echo "═══════════════════════════════════════════════"
echo "  Salt: $SALT"
echo "  Chains: ${#SELECTED[@]}"
echo ""

DEPLOYED=()

for chain in "${SELECTED[@]}"; do
  IFS='|' read -r rpc chain_id <<< "${CHAINS[$chain]}"
  
  echo "─────────────────────────────────────────────"
  echo "  Deploying to: $chain (chain $chain_id)"
  echo "  RPC: $rpc"
  echo ""

  cd "$CONTRACTS_DIR"

  forge script script/Deploy.s.sol:DeployGasGuardCreate2 \
    --rpc-url "$rpc" \
    --broadcast \
    --sig "run(uint256)" "$SALT" \
    2>&1 | grep -E "(GasGuard|Chain|Error|Revert|deployed at)" || true

  echo ""
  DEPLOYED+=("$chain")
done

echo "═══════════════════════════════════════════════"
echo "  Deployed to ${#DEPLOYED[@]} chains"
echo "═══════════════════════════════════════════════"

# Build a summary for the README
echo ""
echo "## Deployed Addresses (CREATE2, salt=$SALT)"
echo ""
for chain in "${SELECTED[@]}"; do
  IFS='|' read -r rpc chain_id <<< "${CHAINS[$chain]}"
  # The CREATE2 address can be precomputed — output a note
  echo "| $chain | $chain_id | (see run output above for deployed address) |"
done
