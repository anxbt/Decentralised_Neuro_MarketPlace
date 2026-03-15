// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {NeuroMarketplace} from "../src/NeuroMarketplace.sol";
import {console} from "forge-std/console.sol";

/**
 * @title Deploy Script for NeuroMarketplace
 * @notice Deploys the NeuroMarketplace contract to Filecoin FVM Calibration testnet
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --private-key $PRIVATE_KEY
 */
contract DeployScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy NeuroMarketplace contract
        NeuroMarketplace marketplace = new NeuroMarketplace();
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        // Log deployment information
        console.log("===========================================");
        console.log("NeuroMarketplace deployed successfully!");
        console.log("===========================================");
        console.log("Contract address:", address(marketplace));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Network: Filecoin FVM Calibration (chainId 314159)");
        console.log("===========================================");
        console.log("");
        console.log("Next steps:");
        console.log("1. Save contract address to frontend/.env as VITE_CONTRACT_ADDRESS");
        console.log("2. Save contract address to backend/.env as CONTRACT_ADDRESS");
        console.log("3. Verify contract on block explorer (optional)");
        console.log("4. Test contract functions with cast commands");
    }
}
