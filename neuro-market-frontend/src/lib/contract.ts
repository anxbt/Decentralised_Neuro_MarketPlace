/**
 * Smart Contract Wrapper for NeuroMarketplace
 * 
 * This module provides typed functions for interacting with the NeuroMarketplace
 * smart contract deployed on Filecoin FVM Calibration testnet.
 * 
 * Features:
 * - Type-safe contract interactions using ethers.js v6
 * - Event listening utilities for DatasetRegistered and DatasetPurchased
 * - Transaction error handling and retry logic
 * - Validates Requirements: 3.1, 5.2, 6.1
 */

import { ethers, Contract, BrowserProvider, parseEther, formatEther } from 'ethers';

// Contract ABI - generated from NeuroMarketplace.sol
const NEURO_MARKETPLACE_ABI = [
  {
    "type": "function",
    "name": "accessControl",
    "inputs": [
      { "name": "", "type": "string", "internalType": "string" },
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "datasets",
    "inputs": [{ "name": "", "type": "string", "internalType": "string" }],
    "outputs": [
      { "name": "cid", "type": "string", "internalType": "string" },
      { "name": "researcher", "type": "address", "internalType": "address" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "contentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "exists", "type": "bool", "internalType": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDataset",
    "inputs": [{ "name": "datasetId", "type": "string", "internalType": "string" }],
    "outputs": [
      { "name": "cid", "type": "string", "internalType": "string" },
      { "name": "researcher", "type": "address", "internalType": "address" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "contentHash", "type": "bytes32", "internalType": "bytes32" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasAccess",
    "inputs": [
      { "name": "datasetId", "type": "string", "internalType": "string" },
      { "name": "buyer", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "purchaseDataset",
    "inputs": [{ "name": "datasetId", "type": "string", "internalType": "string" }],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "registerDataset",
    "inputs": [
      { "name": "datasetId", "type": "string", "internalType": "string" },
      { "name": "cid", "type": "string", "internalType": "string" },
      { "name": "price", "type": "uint256", "internalType": "uint256" },
      { "name": "contentHash", "type": "bytes32", "internalType": "bytes32" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DatasetPurchased",
    "inputs": [
      { "name": "datasetId", "type": "string", "indexed": true, "internalType": "string" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "researcher", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DatasetRegistered",
    "inputs": [
      { "name": "datasetId", "type": "string", "indexed": true, "internalType": "string" },
      { "name": "cid", "type": "string", "indexed": false, "internalType": "string" },
      { "name": "researcher", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" },
      { "name": "contentHash", "type": "bytes32", "indexed": false, "internalType": "bytes32" }
    ],
    "anonymous": false
  }
];

// Contract address on Filecoin FVM Calibration testnet
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b';

// Chain ID for Filecoin FVM Calibration testnet
export const FILECOIN_CALIBRATION_CHAIN_ID = 314159;

/**
 * Dataset information returned from the smart contract
 */
export interface Dataset {
  cid: string;
  researcher: string;
  price: bigint;
  contentHash: string;
  exists: boolean;
}

/**
 * Transaction result with hash and receipt
 */
export interface TransactionResult {
  hash: string;
  wait: () => Promise<ethers.TransactionReceipt | null>;
}

/**
 * Event listener callback types
 */
export type DatasetRegisteredCallback = (
  datasetId: string,
  cid: string,
  researcher: string,
  price: bigint
) => void;

export type DatasetPurchasedCallback = (
  datasetId: string,
  buyer: string,
  researcher: string,
  price: bigint
) => void;

/**
 * Get a contract instance with a signer (for write operations)
 * Requires a connected wallet
 */
async function getContractWithSigner(): Promise<Contract> {
  if (!window.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask or another wallet.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, NEURO_MARKETPLACE_ABI, signer);
}

/**
 * Get a contract instance with a provider (for read operations)
 * Does not require a connected wallet
 */
function getContractWithProvider(): Contract {
  if (!window.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask or another wallet.');
  }

  const provider = new BrowserProvider(window.ethereum);
  return new Contract(CONTRACT_ADDRESS, NEURO_MARKETPLACE_ABI, provider);
}

/**
 * Register a new dataset on the marketplace
 * 
 * @param datasetId - Unique identifier for the dataset
 * @param cid - IPFS content identifier for the encrypted file
 * @param priceInTFIL - Price in tFIL (will be converted to wei)
 * @returns Transaction result with hash and wait function
 * 
 * @throws Error if transaction fails or is rejected
 * 
 * Validates Requirement 3.1: Smart contract registration
 */
export async function registerDataset(
  datasetId: string,
  cid: string,
  priceInTFIL: string,
  contentHash?: string
): Promise<TransactionResult> {
  try {
    const contract = await getContractWithSigner();
    const priceInWei = parseEther(priceInTFIL);

    // Use provided contentHash or compute a zero hash as fallback
    const hash = contentHash || ethers.keccak256(ethers.toUtf8Bytes(cid));

    // Call the registerDataset function with contentHash
    const tx = await contract.registerDataset(datasetId, cid, priceInWei, hash);

    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    }
    if (error.message?.includes('Dataset already exists')) {
      throw new Error('Dataset ID already exists. Please use a unique ID.');
    }
    if (error.message?.includes('CID cannot be empty')) {
      throw new Error('Invalid CID provided');
    }
    if (error.message?.includes('Price must be greater than zero')) {
      throw new Error('Price must be greater than zero');
    }
    
    throw new Error(`Failed to register dataset: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Purchase access to a dataset
 * 
 * @param datasetId - Unique identifier for the dataset to purchase
 * @param priceInTFIL - Price in tFIL (must match dataset price exactly)
 * @returns Transaction result with hash and wait function
 * 
 * @throws Error if transaction fails, payment is incorrect, or already purchased
 * 
 * Validates Requirement 5.2: Purchase transaction with payment
 */
export async function purchaseDataset(
  datasetId: string,
  priceInTFIL: string
): Promise<TransactionResult> {
  try {
    const contract = await getContractWithSigner();
    const priceInWei = parseEther(priceInTFIL);

    // Call the purchaseDataset function with payment
    const tx = await contract.purchaseDataset(datasetId, { value: priceInWei });

    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  } catch (error: any) {
    // Handle specific error cases
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    }
    if (error.message?.includes('Dataset does not exist')) {
      throw new Error('Dataset not found');
    }
    if (error.message?.includes('Incorrect payment amount')) {
      throw new Error('Payment amount does not match dataset price');
    }
    if (error.message?.includes('Already purchased')) {
      throw new Error('You have already purchased this dataset');
    }
    if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient tFIL balance');
    }
    
    throw new Error(`Failed to purchase dataset: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Check if an address has access to a dataset
 * 
 * @param datasetId - Unique identifier for the dataset
 * @param address - Wallet address to check
 * @returns True if the address has access, false otherwise
 * 
 * Validates Requirement 6.1: On-chain access verification
 */
export async function hasAccess(datasetId: string, address: string): Promise<boolean> {
  try {
    const contract = getContractWithProvider();
    return await contract.hasAccess(datasetId, address);
  } catch (error: any) {
    throw new Error(`Failed to check access: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get dataset information from the smart contract
 * 
 * @param datasetId - Unique identifier for the dataset
 * @returns Dataset information including CID, researcher address, and price
 * 
 * @throws Error if dataset does not exist
 */
export async function getDataset(datasetId: string): Promise<Dataset> {
  try {
    const contract = getContractWithProvider();
    const [cid, researcher, price, contentHash] = await contract.getDataset(datasetId);

    return {
      cid,
      researcher,
      price,
      contentHash,
      exists: true
    };
  } catch (error: any) {
    if (error.message?.includes('Dataset does not exist')) {
      throw new Error('Dataset not found');
    }
    throw new Error(`Failed to get dataset: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Convert price from wei to tFIL string
 * 
 * @param priceInWei - Price in wei (bigint)
 * @returns Price as a string in tFIL
 */
export function formatPrice(priceInWei: bigint): string {
  return formatEther(priceInWei);
}

/**
 * Convert price from tFIL string to wei
 * 
 * @param priceInTFIL - Price as a string in tFIL
 * @returns Price in wei (bigint)
 */
export function parsePrice(priceInTFIL: string): bigint {
  return parseEther(priceInTFIL);
}

/**
 * Listen for DatasetRegistered events
 * 
 * @param callback - Function to call when a dataset is registered
 * @returns Cleanup function to remove the listener
 * 
 * Example:
 * ```typescript
 * const unsubscribe = onDatasetRegistered((datasetId, cid, researcher, price) => {
 *   console.log(`Dataset ${datasetId} registered by ${researcher}`);
 * });
 * 
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function onDatasetRegistered(callback: DatasetRegisteredCallback): () => void {
  const contract = getContractWithProvider();
  
  const listener = (datasetId: string, cid: string, researcher: string, price: bigint) => {
    callback(datasetId, cid, researcher, price);
  };

  contract.on('DatasetRegistered', listener);

  // Return cleanup function
  return () => {
    contract.off('DatasetRegistered', listener);
  };
}

/**
 * Listen for DatasetPurchased events
 * 
 * @param callback - Function to call when a dataset is purchased
 * @returns Cleanup function to remove the listener
 * 
 * Example:
 * ```typescript
 * const unsubscribe = onDatasetPurchased((datasetId, buyer, researcher, price) => {
 *   console.log(`Dataset ${datasetId} purchased by ${buyer}`);
 * });
 * 
 * // Later, to stop listening:
 * unsubscribe();
 * ```
 */
export function onDatasetPurchased(callback: DatasetPurchasedCallback): () => void {
  const contract = getContractWithProvider();
  
  const listener = (datasetId: string, buyer: string, researcher: string, price: bigint) => {
    callback(datasetId, buyer, researcher, price);
  };

  contract.on('DatasetPurchased', listener);

  // Return cleanup function
  return () => {
    contract.off('DatasetPurchased', listener);
  };
}

/**
 * Listen for DatasetRegistered events for a specific researcher
 * 
 * @param researcherAddress - Address of the researcher to filter by
 * @param callback - Function to call when a dataset is registered by this researcher
 * @returns Cleanup function to remove the listener
 */
export function onDatasetRegisteredByResearcher(
  researcherAddress: string,
  callback: DatasetRegisteredCallback
): () => void {
  const contract = getContractWithProvider();
  
  // Create a filter for events from this researcher
  const filter = contract.filters.DatasetRegistered(null, researcherAddress);
  
  const listener = (datasetId: string, cid: string, researcher: string, price: bigint) => {
    callback(datasetId, cid, researcher, price);
  };

  contract.on(filter, listener);

  // Return cleanup function
  return () => {
    contract.off(filter, listener);
  };
}

/**
 * Listen for DatasetPurchased events for a specific buyer
 * 
 * @param buyerAddress - Address of the buyer to filter by
 * @param callback - Function to call when this buyer purchases a dataset
 * @returns Cleanup function to remove the listener
 */
export function onDatasetPurchasedByBuyer(
  buyerAddress: string,
  callback: DatasetPurchasedCallback
): () => void {
  const contract = getContractWithProvider();
  
  // Create a filter for events where this address is the buyer
  const filter = contract.filters.DatasetPurchased(null, buyerAddress);
  
  const listener = (datasetId: string, buyer: string, researcher: string, price: bigint) => {
    callback(datasetId, buyer, researcher, price);
  };

  contract.on(filter, listener);

  // Return cleanup function
  return () => {
    contract.off(filter, listener);
  };
}

/**
 * Retry a transaction with exponential backoff
 * 
 * @param fn - Async function that returns a transaction result
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in milliseconds (default: 1000)
 * @returns Transaction result
 * 
 * @throws Error if all retries fail
 */
export async function retryTransaction<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if user rejected the transaction
      if (error.code === 'ACTION_REJECTED') {
        throw error;
      }
      
      // Don't retry on validation errors
      if (
        error.message?.includes('already exists') ||
        error.message?.includes('Already purchased') ||
        error.message?.includes('Incorrect payment amount')
      ) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError!.message}`);
}

/**
 * Export the contract ABI for use in other modules (e.g., Lit Protocol)
 */
export { NEURO_MARKETPLACE_ABI, CONTRACT_ADDRESS };
