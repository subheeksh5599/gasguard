// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GasGuard} from "../src/GasGuard.sol";

contract GasGuardTest is Test {
    GasGuard internal guard;

    address internal owner = makeAddr("owner");
    address internal wallet1 = makeAddr("wallet1");
    address internal wallet2 = makeAddr("wallet2");
    address internal keeper = makeAddr("keeper");

    uint256 internal constant THRESHOLD = 0.1 ether;
    uint256 internal constant TOP_UP = 0.25 ether;

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event Refueled(address indexed owner, address indexed wallet, uint256 amount);
    event ConfigSet(address indexed owner, address indexed wallet, uint256 threshold, uint256 topUp);
    event WalletRemoved(address indexed owner, address indexed wallet);

    function setUp() public {
        guard = new GasGuard();
        vm.deal(owner, 10 ether);
        vm.deal(wallet1, 1 ether);
        vm.deal(wallet2, 1 ether);
        vm.deal(keeper, 1 ether);
    }

    // --- Deposit ---

    function test_Deposit_IncreasesTank() public {
        vm.prank(owner);
        guard.deposit{value: 1 ether}();
        assertEq(guard.tankBalance(owner), 1 ether);
    }

    function test_Deposit_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(owner, 1 ether);
        vm.prank(owner);
        guard.deposit{value: 1 ether}();
    }

    function test_Deposit_ZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(GasGuard.ZeroAmount.selector);
        guard.deposit{value: 0}();
    }

    function test_Receive_Deposits() public {
        vm.prank(owner);
        (bool ok, ) = address(guard).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(guard.tankBalance(owner), 0.5 ether);
    }

    // --- Config ---

    function test_SetConfig_RequiresTankBalance() public {
        vm.prank(owner);
        vm.expectRevert(GasGuard.NoTankBalance.selector);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
    }

    function test_SetConfig_StoresConfig() public {
        _fund(owner, 1 ether);
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);

        (uint256 threshold, uint256 topUp, bool active) = guard.getConfig(owner, wallet1);
        assertEq(threshold, THRESHOLD);
        assertEq(topUp, TOP_UP);
        assertTrue(active);
    }

    function test_SetConfig_EmitsEvent() public {
        _fund(owner, 1 ether);
        vm.expectEmit(true, true, false, true);
        emit ConfigSet(owner, wallet1, THRESHOLD, TOP_UP);
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
    }

    function test_MultiWallet_AddMultipleWallets() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD * 2, TOP_UP * 2);
        vm.stopPrank();

        assertEq(guard.getWalletCount(owner), 2);
        address[] memory wallets = guard.getWallets(owner);
        assertEq(wallets.length, 2);
        assertEq(wallets[0], wallet1);
        assertEq(wallets[1], wallet2);

        (uint256 t1, uint256 a1, bool ac1) = guard.getConfig(owner, wallet1);
        assertEq(t1, THRESHOLD);
        assertEq(a1, TOP_UP);
        assertTrue(ac1);

        (uint256 t2, uint256 a2, bool ac2) = guard.getConfig(owner, wallet2);
        assertEq(t2, THRESHOLD * 2);
        assertEq(a2, TOP_UP * 2);
        assertTrue(ac2);
    }

    function test_RemoveWallet_RemovesFromList() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD, TOP_UP);
        guard.removeWallet(wallet1);
        vm.stopPrank();

        assertEq(guard.getWalletCount(owner), 1);
        address[] memory wallets = guard.getWallets(owner);
        assertEq(wallets[0], wallet2);

        (, , bool active) = guard.getConfig(owner, wallet1);
        assertFalse(active);
    }

    function test_RemoveWallet_RevertsWhenNotFound() public {
        _fund(owner, 1 ether);
        vm.prank(owner);
        vm.expectRevert(GasGuard.WalletNotFound.selector);
        guard.removeWallet(wallet1);
    }

    function test_RemoveWallet_EmitsEvent() public {
        _fund(owner, 1 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        vm.expectEmit(true, true, false, false);
        emit WalletRemoved(owner, wallet1);
        guard.removeWallet(wallet1);
        vm.stopPrank();
    }

    function test_ClearConfig_RemovesAllWallets() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD, TOP_UP);
        guard.clearConfig();
        vm.stopPrank();

        assertEq(guard.getWalletCount(owner), 0);
        (, , bool a1) = guard.getConfig(owner, wallet1);
        (, , bool a2) = guard.getConfig(owner, wallet2);
        assertFalse(a1);
        assertFalse(a2);
    }

    // --- needsRefuel view ---

    function test_NeedsRefuel_FalseWithoutConfig() public view {
        assertFalse(guard.needsRefuel(owner, wallet1));
    }

    function test_NeedsRefuel_TrueWhenBelowThreshold() public {
        _fund(owner, 1 ether);
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);

        vm.deal(wallet1, 0.01 ether); // below threshold
        assertTrue(guard.needsRefuel(owner, wallet1));
    }

    // --- checkAndRefuel ---

    function test_CheckAndRefuel_RevertsWithoutConfig() public {
        vm.expectRevert(GasGuard.NoConfigSet.selector);
        guard.checkAndRefuel(owner, wallet1);
    }

    function test_CheckAndRefuel_SendsWhenBelowThreshold() public {
        _fund(owner, 1 ether);
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);

        vm.deal(wallet1, 0.01 ether); // simulate a low wallet
        uint256 tankBefore = guard.tankBalance(owner);

        vm.expectEmit(true, true, false, true);
        emit Refueled(owner, wallet1, TOP_UP);

        vm.prank(keeper); // permissionless: anyone can trigger
        guard.checkAndRefuel(owner, wallet1);

        assertEq(wallet1.balance, 0.01 ether + TOP_UP);
        assertEq(guard.tankBalance(owner), tankBefore - TOP_UP);
    }

    function test_CheckAndRefuel_NoopWhenAboveThreshold() public {
        _fund(owner, 1 ether);
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);

        vm.deal(wallet1, 5 ether); // comfortably above threshold
        uint256 tankBefore = guard.tankBalance(owner);
        uint256 balBefore = wallet1.balance;

        guard.checkAndRefuel(owner, wallet1);

        assertEq(guard.tankBalance(owner), tankBefore);
        assertEq(wallet1.balance, balBefore);
    }

    function test_CheckAndRefuel_RevertsWhenTankTooLow() public {
        _fund(owner, 0.1 ether); // tank smaller than top-up amount
        vm.prank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);

        vm.deal(wallet1, 0.01 ether); // below threshold
        vm.expectRevert(GasGuard.InsufficientTankBalance.selector);
        guard.checkAndRefuel(owner, wallet1);
    }

    // --- checkAndRefuelAll ---

    function test_CheckAndRefuelAll_RefuelsAllBelowThreshold() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);       // 0.1 / 0.25
        guard.setConfig(wallet2, THRESHOLD, TOP_UP);       // 0.1 / 0.25
        vm.stopPrank();

        vm.deal(wallet1, 0.01 ether); // below
        vm.deal(wallet2, 0.01 ether); // below

        vm.prank(keeper);
        guard.checkAndRefuelAll(owner);

        assertEq(wallet1.balance, 0.01 ether + TOP_UP);
        assertEq(wallet2.balance, 0.01 ether + TOP_UP);
    }

    function test_CheckAndRefuelAll_SkipsAboveThreshold() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD, TOP_UP);
        vm.stopPrank();

        vm.deal(wallet1, 0.01 ether); // below → refuel
        vm.deal(wallet2, 5 ether);    // above → skip

        vm.prank(keeper);
        guard.checkAndRefuelAll(owner);

        assertEq(wallet1.balance, 0.01 ether + TOP_UP);
        assertEq(wallet2.balance, 5 ether); // untouched
    }

    function test_CheckAndRefuelAll_RevertsWhenTankTooLow() public {
        _fund(owner, 0.3 ether); // enough for one refuel, not two
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD, TOP_UP);
        vm.stopPrank();

        vm.deal(wallet1, 0.01 ether);
        vm.deal(wallet2, 0.01 ether);

        vm.expectRevert(GasGuard.InsufficientTankBalance.selector);
        guard.checkAndRefuelAll(owner);
    }

    // --- getAllConfigs ---

    function test_GetAllConfigs_ReturnsAll() public {
        _fund(owner, 2 ether);
        vm.startPrank(owner);
        guard.setConfig(wallet1, THRESHOLD, TOP_UP);
        guard.setConfig(wallet2, THRESHOLD * 2, TOP_UP * 2);
        vm.stopPrank();

        vm.deal(wallet1, 0.01 ether); // below → needs refuel
        vm.deal(wallet2, 5 ether);    // above → no refuel needed

        (
            address[] memory wallets,
            uint256[] memory thresholds,
            uint256[] memory topUps,
            bool[] memory actives,
            bool[] memory needs
        ) = guard.getAllConfigs(owner);

        assertEq(wallets.length, 2);
        assertEq(wallets[0], wallet1);
        assertEq(wallets[1], wallet2);
        assertEq(thresholds[0], THRESHOLD);
        assertEq(thresholds[1], THRESHOLD * 2);
        assertTrue(needs[0]);
        assertFalse(needs[1]);
    }

    // --- Withdraw ---

    function test_Withdraw_ReducesTankAndPays() public {
        _fund(owner, 1 ether);
        vm.deal(owner, 0); // isolate the withdrawn amount in the assertion

        vm.expectEmit(true, false, false, true);
        emit Withdrawn(owner, 0.4 ether);

        vm.prank(owner);
        guard.withdraw(0.4 ether);

        assertEq(guard.tankBalance(owner), 0.6 ether);
        assertEq(owner.balance, 0.4 ether);
    }

    function test_Withdraw_RevertsWhenInsufficient() public {
        _fund(owner, 0.5 ether);
        vm.prank(owner);
        vm.expectRevert(GasGuard.InsufficientTankBalance.selector);
        guard.withdraw(1 ether);
    }

    // --- helpers ---

    function _fund(address who, uint256 amount) internal {
        vm.prank(who);
        guard.deposit{value: amount}();
    }
}
