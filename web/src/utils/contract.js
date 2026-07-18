import { ethers } from 'ethers'

// Replace with deployed contract address
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x89B230004eEf2115486F4C76529659D5a85D9397'

const ABI = [
  'function tankBalance(address) view returns (uint256)',
  'function getConfig(address, address) view returns (uint256 threshold, uint256 topUpAmount, bool active)',
  'function needsRefuel(address, address) view returns (bool)',
  'function getWallets(address) view returns (address[])',
  'function getWalletCount(address) view returns (uint256)',
  'function getAllConfigs(address) view returns (address[] wallets, uint256[] thresholds, uint256[] topUpAmounts, bool[] actives, bool[] needsRefuels)',
  'function deposit() payable',
  'function setConfig(address, uint256, uint256)',
  'function removeWallet(address)',
  'function clearConfig()',
  'function checkAndRefuel(address, address)',
  'function checkAndRefuelAll(address)',
  'function withdraw(uint256)',
  'event Refueled(address indexed owner, address indexed wallet, uint256 amount)',
  'event Deposited(address indexed from, uint256 amount)',
  'event Withdrawn(address indexed to, uint256 amount)',
  'event ConfigSet(address indexed owner, address indexed wallet, uint256 threshold, uint256 topUp)',
  'event WalletRemoved(address indexed owner, address indexed wallet)',
]

export function getContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
}

export function getContractAddress() {
  return CONTRACT_ADDRESS
}

export function shortenAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatMon(weiAmount) {
  return parseFloat(ethers.formatEther(weiAmount || 0)).toFixed(4)
}

export function txUrl(hash) {
  return `https://testnet.monadexplorer.com/tx/${hash}`
}

export function addressUrl(addr) {
  return `https://testnet.monadexplorer.com/address/${addr}`
}
