// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {GasGuard} from "../src/GasGuard.sol";

/// @notice Deploy GasGuard deterministically via CREATE2 using the deployer's nonce
///         or directly (for chains where CREATE2 isn't needed).
///         Usage: forge script script/Deploy.s.sol --rpc-url <chain> --broadcast
contract DeployGasGuard is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        GasGuard gasGuard = new GasGuard();

        vm.stopBroadcast();

        console.log("GasGuard deployed at:", address(gasGuard));
        console.log("Chain ID:", block.chainid);
    }
}

/// @notice Deploy GasGuard using CREATE2 with a deterministic salt.
///         The contract address will be the same on every chain.
///         Usage:
///           forge script script/Deploy.s.sol:DeployGasGuardCreate2 \
///             --rpc-url <chain> --broadcast --sig "run(uint256)" <salt>
contract DeployGasGuardCreate2 is Script {
    function run(uint256 salt) external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // Deploy via CREATE2 using the deployer's address as the factory
        // address = keccak256(0xff ++ deployer ++ salt ++ keccak256(init_code))[12:]
        GasGuard gasGuard = new GasGuard{salt: bytes32(salt)}();

        vm.stopBroadcast();

        console.log("GasGuard (CREATE2) deployed at:", address(gasGuard));
        console.log("Chain ID:", block.chainid);
        console.log("Salt:", salt);
        console.log("Deployer:", deployer);
    }
}
