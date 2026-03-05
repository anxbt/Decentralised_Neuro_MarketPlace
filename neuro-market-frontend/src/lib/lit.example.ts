/**
 * Example usage of Lit Protocol encryption for NeuroMarket
 * 
 * This file demonstrates how to use the encryptFile function
 * to encrypt EEG datasets before uploading to IPFS.
 * 
 * Validates Requirements: 2.2, 11.2, 11.6
 */

import { initializeLitClient, getLitClient } from './lit';

/**
 * Example: Encrypting a file before upload
 * 
 * This example shows the complete flow of encrypting a file
 * with Lit Protocol access control conditions.
 */
export async function exampleEncryptFile() {
  // Step 1: Initialize the Lit Protocol client with your smart contract address
  const contractAddress = '0x1234567890123456789012345678901234567890'; // Your deployed contract
  initializeLitClient(contractAddress, 'filecoin');
  
  // Step 2: Get the client instance
  const litClient = getLitClient();
  
  // Step 3: Connect to the Lit Protocol network
  await litClient.connect();
  
  // Step 4: Prepare your file (from user input)
  const file = new File(['EEG data content'], 'eeg-dataset.csv', { 
    type: 'text/csv' 
  });
  
  // Step 5: Generate a unique dataset ID
  const datasetId = `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Step 6: Encrypt the file
    // This will:
    // - Convert the file to base64
    // - Encrypt it with Lit Protocol
    // - Configure access control to check the smart contract's hasAccess function
    const { ciphertext, dataToEncryptHash } = await litClient.encryptFile(
      file,
      datasetId
    );
    
    console.log('Encryption successful!');
    console.log('Ciphertext:', ciphertext.substring(0, 50) + '...');
    console.log('Data hash:', dataToEncryptHash);
    
    // Step 7: Now you can upload the ciphertext to IPFS via Pinata
    // The encrypted data can only be decrypted by users who have
    // purchased access (verified on-chain via the smart contract)
    
    return {
      ciphertext,
      dataToEncryptHash,
      datasetId,
    };
  } catch (error) {
    // Step 8: Handle errors with user-friendly messages
    if (error instanceof Error) {
      console.error('Encryption failed:', error.message);
      
      // The error messages are user-friendly:
      // - "No file provided for encryption"
      // - "Dataset ID is required for encryption"
      // - "Unable to connect to encryption service..."
      // - "Network error during encryption..."
      // - "Failed to encrypt file. Please try again..."
    }
    throw error;
  }
}

/**
 * Example: Access Control Conditions
 * 
 * The encryptFile function automatically configures access control
 * conditions that verify on-chain ownership via the smart contract.
 * 
 * The access control condition checks:
 * - Contract: NeuroMarketplace smart contract
 * - Function: hasAccess(datasetId, userAddress)
 * - Expected: returns true
 * 
 * This means only users who have purchased the dataset
 * (and have been granted access on-chain) can decrypt the file.
 */
export function exampleAccessControlFlow() {
  console.log(`
Access Control Flow:
1. Researcher encrypts file with datasetId
2. Encrypted file is uploaded to IPFS
3. Dataset is registered on smart contract
4. Buyer purchases dataset (calls purchaseDataset)
5. Smart contract grants access (sets accessControl[datasetId][buyer] = true)
6. Buyer attempts to decrypt
7. Lit Protocol calls hasAccess(datasetId, buyer) on smart contract
8. If hasAccess returns true, decryption proceeds
9. If hasAccess returns false, decryption is denied
  `);
}

/**
 * Example: Error Handling
 * 
 * The encryptFile function provides user-friendly error messages
 * for common failure scenarios.
 */
export async function exampleErrorHandling() {
  initializeLitClient('0x1234567890123456789012345678901234567890');
  const litClient = getLitClient();
  
  // Example 1: Missing file
  try {
    await litClient.encryptFile(null as any, 'dataset-123');
  } catch (error) {
    console.log('Error:', (error as Error).message);
    // Output: "No file provided for encryption"
  }
  
  // Example 2: Missing dataset ID
  try {
    const file = new File(['data'], 'test.csv');
    await litClient.encryptFile(file, '');
  } catch (error) {
    console.log('Error:', (error as Error).message);
    // Output: "Dataset ID is required for encryption"
  }
  
  // Example 3: Network errors are caught and made user-friendly
  // If Lit Protocol connection fails, you'll see:
  // "Unable to connect to encryption service. Please check your internet connection and try again."
  
  // Example 4: Generic errors are also made user-friendly
  // "Failed to encrypt file. Please try again or contact support if the problem persists."
}

/**
 * Integration with Upload Flow
 * 
 * Here's how encryptFile fits into the complete upload pipeline:
 */
export async function exampleCompleteUploadFlow() {
  // 1. User selects file in UploadForm component
  const file = new File(['EEG data'], 'dataset.csv', { type: 'text/csv' });
  const datasetId = `dataset-${Date.now()}`;
  
  // 2. Initialize Lit Protocol
  initializeLitClient(process.env.VITE_CONTRACT_ADDRESS || '');
  const litClient = getLitClient();
  await litClient.connect();
  
  // 3. Encrypt file (THIS TASK - 8.2)
  const { ciphertext, dataToEncryptHash } = await litClient.encryptFile(
    file,
    datasetId
  );
  
  // 4. Upload encrypted data to Pinata (Task 8.3)
  // const cid = await pinFileToPinata(ciphertext, metadata);
  
  // 5. Register dataset on smart contract (Task 8.4)
  // await contract.registerDataset(datasetId, cid, price);
  
  // 6. Store metadata in backend (Task 8.5)
  // await api.post('/datasets', { datasetId, cid, ... });
  
  console.log('Upload complete!');
}
