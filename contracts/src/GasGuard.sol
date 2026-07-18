// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GasGuard — Pre-paid gas reserve for Monad wallets
/// @notice Deposit MON into a tank. Set balance thresholds for multiple wallets.
///         When any watched wallet dips below threshold, anyone can trigger a refuel.
/// @dev v2 — Multi-wallet support: one tank can watch and refuel many wallets.
contract GasGuard {
    struct Config {
        uint256 threshold;   // minimum wallet balance before refuel is allowed
        uint256 topUpAmount; // how much MON to send per refuel
        bool active;
    }

    /// @notice Per-user tank balance (MON stored in contract for that user)
    mapping(address => uint256) public tankBalance;

    /// @notice Per-owner, per-watched-wallet configuration
    ///         owner => watchedWallet => Config
    mapping(address => mapping(address => Config)) public walletConfig;

    /// @notice List of watched wallets per owner (for enumeration)
    mapping(address => address[]) private _watchedWallets;

    /// @notice Index of a watched wallet in the array (for O(1) removal)
    mapping(address => mapping(address => uint256)) private _walletIndex;

    // --- Events ---

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Refueled(address indexed owner, address indexed wallet, uint256 amount);
    event ConfigSet(address indexed owner, address indexed wallet, uint256 threshold, uint256 topUp);
    event WalletRemoved(address indexed owner, address indexed wallet);

    // --- Errors ---

    error NoTankBalance();
    error NoConfigSet();
    error InsufficientTankBalance();
    error RefuelFailed();
    error WithdrawFailed();
    error ZeroAmount();
    error WalletNotFound();

    // --- Deposit ---

    /// @notice Deposit MON into your tank
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        tankBalance[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // --- Configuration ---

    /// @notice Set a wallet to watch and the refuel parameters.
    ///         If the wallet is new, it's added to the owner's watch list.
    /// @param _wallet The wallet address to monitor
    /// @param _threshold Minimum balance before refuel triggers
    /// @param _topUpAmount How much MON to send per refuel
    function setConfig(
        address _wallet,
        uint256 _threshold,
        uint256 _topUpAmount
    ) external {
        if (tankBalance[msg.sender] == 0) revert NoTankBalance();

        // If this is a new wallet, add it to the array
        if (!walletConfig[msg.sender][_wallet].active) {
            _walletIndex[msg.sender][_wallet] = _watchedWallets[msg.sender].length;
            _watchedWallets[msg.sender].push(_wallet);
        }

        walletConfig[msg.sender][_wallet] = Config(_threshold, _topUpAmount, true);
        emit ConfigSet(msg.sender, _wallet, _threshold, _topUpAmount);
    }

    /// @notice Remove a single watched wallet (stops refuels for it, tank balance stays)
    /// @param _wallet The wallet to stop watching
    function removeWallet(address _wallet) external {
        if (!walletConfig[msg.sender][_wallet].active) revert WalletNotFound();

        delete walletConfig[msg.sender][_wallet];

        // Remove from array (swap-and-pop for O(1))
        uint256 idx = _walletIndex[msg.sender][_wallet];
        address[] storage wallets = _watchedWallets[msg.sender];
        uint256 lastIdx = wallets.length - 1;

        if (idx != lastIdx) {
            address lastWallet = wallets[lastIdx];
            wallets[idx] = lastWallet;
            _walletIndex[msg.sender][lastWallet] = idx;
        }

        wallets.pop();
        delete _walletIndex[msg.sender][_wallet];

        emit WalletRemoved(msg.sender, _wallet);
    }

    /// @notice Remove all watched wallets (stops all refuels, tank balance stays)
    function clearConfig() external {
        address[] storage wallets = _watchedWallets[msg.sender];
        uint256 len = wallets.length;
        for (uint256 i = 0; i < len; i++) {
            address w = wallets[i];
            delete walletConfig[msg.sender][w];
            delete _walletIndex[msg.sender][w];
        }
        delete _watchedWallets[msg.sender];
    }

    // --- Refuel ---

    /// @notice Check if a specific watched wallet needs refueling and send MON if so.
    ///         Anyone can call this — owner does not need to sign.
    /// @param _owner The address whose tank funds the refuel
    /// @param _wallet The watched wallet to check and refuel
    function checkAndRefuel(address _owner, address _wallet) external {
        Config memory cfg = walletConfig[_owner][_wallet];
        if (!cfg.active) revert NoConfigSet();

        // Watched wallet's balance is below the configured threshold
        if (_wallet.balance < cfg.threshold) {
            if (tankBalance[_owner] < cfg.topUpAmount) {
                revert InsufficientTankBalance();
            }

            tankBalance[_owner] -= cfg.topUpAmount;

            (bool ok, ) = _wallet.call{value: cfg.topUpAmount}("");
            if (!ok) revert RefuelFailed();

            emit Refueled(_owner, _wallet, cfg.topUpAmount);
        }
    }

    /// @notice Check and refuel ALL watched wallets for an owner in one transaction.
    ///         Skips wallets that are above threshold. Reverts if any single refuel
    ///         would fail due to insufficient tank balance.
    /// @param _owner The address whose tank funds all refuels
    function checkAndRefuelAll(address _owner) external {
        address[] storage wallets = _watchedWallets[_owner];
        uint256 len = wallets.length;

        for (uint256 i = 0; i < len; i++) {
            address wallet = wallets[i];
            Config memory cfg = walletConfig[_owner][wallet];
            if (!cfg.active) continue;

            if (wallet.balance < cfg.threshold) {
                if (tankBalance[_owner] < cfg.topUpAmount) {
                    revert InsufficientTankBalance();
                }

                tankBalance[_owner] -= cfg.topUpAmount;

                (bool ok, ) = wallet.call{value: cfg.topUpAmount}("");
                if (!ok) revert RefuelFailed();

                emit Refueled(_owner, wallet, cfg.topUpAmount);
            }
        }
    }

    // --- Withdraw ---

    /// @notice Pull unused MON back from your tank
    /// @param _amount Amount to withdraw in wei
    function withdraw(uint256 _amount) external {
        if (_amount == 0) revert ZeroAmount();
        if (tankBalance[msg.sender] < _amount) revert InsufficientTankBalance();

        tankBalance[msg.sender] -= _amount;

        (bool ok, ) = msg.sender.call{value: _amount}("");
        if (!ok) revert WithdrawFailed();

        emit Withdrawn(msg.sender, _amount);
    }

    // --- Views ---

    /// @notice Get configuration for a specific watched wallet
    function getConfig(
        address _owner,
        address _wallet
    )
        external
        view
        returns (uint256 threshold, uint256 topUpAmount, bool active)
    {
        Config memory cfg = walletConfig[_owner][_wallet];
        return (cfg.threshold, cfg.topUpAmount, cfg.active);
    }

    /// @notice Check if a specific watched wallet would be refueled right now
    function needsRefuel(address _owner, address _wallet) external view returns (bool) {
        Config memory cfg = walletConfig[_owner][_wallet];
        return cfg.active && _wallet.balance < cfg.threshold;
    }

    /// @notice Get all watched wallets for an owner
    function getWallets(address _owner) external view returns (address[] memory) {
        return _watchedWallets[_owner];
    }

    /// @notice Get the number of watched wallets for an owner
    function getWalletCount(address _owner) external view returns (uint256) {
        return _watchedWallets[_owner].length;
    }

    /// @notice Get all watched wallets + their configs in one call (for UI)
    function getAllConfigs(
        address _owner
    )
        external
        view
        returns (
            address[] memory wallets,
            uint256[] memory thresholds,
            uint256[] memory topUpAmounts,
            bool[] memory actives,
            bool[] memory needsRefuels
        )
    {
        address[] storage ws = _watchedWallets[_owner];
        uint256 len = ws.length;

        wallets = ws;
        thresholds = new uint256[](len);
        topUpAmounts = new uint256[](len);
        actives = new bool[](len);
        needsRefuels = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            Config memory cfg = walletConfig[_owner][ws[i]];
            thresholds[i] = cfg.threshold;
            topUpAmounts[i] = cfg.topUpAmount;
            actives[i] = cfg.active;
            needsRefuels[i] = cfg.active && ws[i].balance < cfg.threshold;
        }
    }

    // --- Fallback ---

    /// @notice Accept direct MON transfers as deposits
    receive() external payable {
        tankBalance[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
