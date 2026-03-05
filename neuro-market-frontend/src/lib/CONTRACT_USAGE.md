# Contract Wrapper Usage Guide

This guide demonstrates how to use the `contract.ts` wrapper to interact with the NeuroMarketplace smart contract.

## Prerequisites

- User must have a connected wallet (via RainbowKit/wagmi)
- Wallet must be on Filecoin FVM Calibration testnet (chainId: 314159)
- For write operations, user must have sufficient tFIL balance

## Import Functions

```typescript
import {
  registerDataset,
  purchaseDataset,
  hasAccess,
  getDataset,
  formatPrice,
  parsePrice,
  onDatasetRegistered,
  onDatasetPurchased,
  retryTransaction,
  CONTRACT_ADDRESS,
  FILECOIN_CALIBRATION_CHAIN_ID
} from './lib/contract';
```

## Register a Dataset

```typescript
// After encrypting file and uploading to IPFS
async function handleRegisterDataset() {
  try {
    const datasetId = 'dataset-' + Date.now();
    const cid = 'QmYourIPFSHash...';
    const priceInTFIL = '0.5'; // 0.5 tFIL

    const tx = await registerDataset(datasetId, cid, priceInTFIL);
    console.log('Transaction hash:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Dataset registered! Block:', receipt?.blockNumber);

    // Store datasetId and tx.hash in backend
    await fetch('/api/datasets', {
      method: 'POST',
      body: JSON.stringify({
        id: datasetId,
        cid,
        price: priceInTFIL,
        txHash: tx.hash
      })
    });
  } catch (error) {
    console.error('Registration failed:', error.message);
    // Show error to user
  }
}
```

## Purchase a Dataset

```typescript
async function handlePurchaseDataset(datasetId: string) {
  try {
    // First, get the dataset to know the price
    const dataset = await getDataset(datasetId);
    const priceInTFIL = formatPrice(dataset.price);

    console.log(`Purchasing dataset for ${priceInTFIL} tFIL`);

    const tx = await purchaseDataset(datasetId, priceInTFIL);
    console.log('Transaction hash:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Purchase complete! Block:', receipt?.blockNumber);

    // Update UI to show user now owns the dataset
    setOwnsDataset(true);
  } catch (error) {
    if (error.message.includes('Already purchased')) {
      console.log('You already own this dataset');
    } else if (error.message.includes('Insufficient tFIL')) {
      console.error('Not enough tFIL balance');
    } else {
      console.error('Purchase failed:', error.message);
    }
  }
}
```

## Check Access Rights

```typescript
async function checkUserAccess(datasetId: string, userAddress: string) {
  try {
    const hasAccessToDataset = await hasAccess(datasetId, userAddress);
    
    if (hasAccessToDataset) {
      console.log('User has access - show download button');
      return true;
    } else {
      console.log('User does not have access - show purchase button');
      return false;
    }
  } catch (error) {
    console.error('Failed to check access:', error.message);
    return false;
  }
}
```

## Get Dataset Information

```typescript
async function loadDatasetDetails(datasetId: string) {
  try {
    const dataset = await getDataset(datasetId);
    
    console.log('CID:', dataset.cid);
    console.log('Researcher:', dataset.researcher);
    console.log('Price:', formatPrice(dataset.price), 'tFIL');
    
    return {
      cid: dataset.cid,
      researcher: dataset.researcher,
      price: formatPrice(dataset.price)
    };
  } catch (error) {
    if (error.message.includes('Dataset not found')) {
      console.error('Dataset does not exist');
    } else {
      console.error('Failed to load dataset:', error.message);
    }
    return null;
  }
}
```

## Listen for Events

### Listen for All Dataset Registrations

```typescript
import { useEffect } from 'react';

function MarketplaceListener() {
  useEffect(() => {
    // Subscribe to DatasetRegistered events
    const unsubscribe = onDatasetRegistered((datasetId, cid, researcher, price) => {
      console.log('New dataset registered!');
      console.log('ID:', datasetId);
      console.log('CID:', cid);
      console.log('Researcher:', researcher);
      console.log('Price:', formatPrice(price), 'tFIL');
      
      // Refresh marketplace listing
      refreshDatasets();
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return <div>Marketplace</div>;
}
```

### Listen for All Purchases

```typescript
import { useEffect } from 'react';

function PurchaseListener() {
  useEffect(() => {
    const unsubscribe = onDatasetPurchased((datasetId, buyer, researcher, price) => {
      console.log('Dataset purchased!');
      console.log('Dataset ID:', datasetId);
      console.log('Buyer:', buyer);
      console.log('Researcher:', researcher);
      console.log('Price:', formatPrice(price), 'tFIL');
      
      // Update purchase count in UI
      updatePurchaseCount(datasetId);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <div>Purchase Tracker</div>;
}
```

## Retry Failed Transactions

```typescript
async function registerWithRetry(datasetId: string, cid: string, price: string) {
  try {
    // Automatically retry up to 3 times on network errors
    const tx = await retryTransaction(
      () => registerDataset(datasetId, cid, price),
      3,  // max retries
      1000 // initial delay (ms)
    );

    console.log('Transaction succeeded:', tx.hash);
    return tx;
  } catch (error) {
    console.error('Failed after retries:', error.message);
    throw error;
  }
}
```

## Price Conversion Utilities

```typescript
// Convert from wei to tFIL for display
const priceInWei = BigInt('1000000000000000000');
const displayPrice = formatPrice(priceInWei); // "1.0"

// Convert from tFIL input to wei for contract calls
const userInput = '0.5';
const priceInWei = parsePrice(userInput); // BigInt('500000000000000000')
```

## Error Handling Best Practices

```typescript
async function safeContractCall() {
  try {
    const tx = await registerDataset('dataset-1', 'QmTest', '1.0');
    await tx.wait();
  } catch (error) {
    // User rejected transaction
    if (error.message.includes('rejected by user')) {
      console.log('User cancelled the transaction');
      return;
    }
    
    // Validation errors
    if (error.message.includes('already exists')) {
      alert('This dataset ID is already taken');
      return;
    }
    
    // Network errors
    if (error.message.includes('network')) {
      alert('Network error. Please try again.');
      return;
    }
    
    // Generic error
    alert('Transaction failed: ' + error.message);
  }
}
```

## Integration with Lit Protocol

```typescript
import { hasAccess, CONTRACT_ADDRESS, NEURO_MARKETPLACE_ABI } from './lib/contract';

// Use hasAccess function in Lit Protocol access control conditions
const accessControlConditions = [{
  contractAddress: CONTRACT_ADDRESS,
  functionName: 'hasAccess',
  functionParams: [datasetId, ':userAddress'],
  functionAbi: NEURO_MARKETPLACE_ABI.find(item => item.name === 'hasAccess'),
  chain: 'filecoin',
  returnValueTest: {
    comparator: '=',
    value: 'true'
  }
}];

// Lit Protocol will call hasAccess() before allowing decryption
const decryptedFile = await LitJsSdk.decryptToFile({
  file: encryptedFile,
  symmetricKey: encryptedSymmetricKey,
  accessControlConditions,
  chain: 'filecoin',
  authSig: await getAuthSig(buyerAddress)
});
```

## Complete Upload Flow Example

```typescript
async function completeUploadFlow(
  file: File,
  title: string,
  description: string,
  priceInTFIL: string,
  researcherAddress: string
) {
  try {
    // 1. Generate unique dataset ID
    const datasetId = `dataset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 2. Encrypt file with Lit Protocol
    console.log('Encrypting file...');
    const { encryptedFile, encryptedSymmetricKey } = await encryptFile(file, datasetId);
    
    // 3. Upload to IPFS via Pinata
    console.log('Uploading to IPFS...');
    const cid = await pinFileToPinata(encryptedFile, {
      name: title,
      keyvalues: { datasetId }
    });
    
    // 4. Register on smart contract
    console.log('Registering on blockchain...');
    const tx = await registerDataset(datasetId, cid, priceInTFIL);
    await tx.wait();
    
    // 5. Store metadata in backend
    console.log('Storing metadata...');
    await fetch('/api/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: datasetId,
        title,
        description,
        price: priceInTFIL,
        cid,
        researcherAddress,
        txHash: tx.hash,
        uploadDate: new Date().toISOString()
      })
    });
    
    console.log('Upload complete!');
    return { datasetId, cid, txHash: tx.hash };
  } catch (error) {
    console.error('Upload failed:', error.message);
    throw error;
  }
}
```

## Complete Purchase Flow Example

```typescript
async function completePurchaseFlow(
  datasetId: string,
  buyerAddress: string
) {
  try {
    // 1. Get dataset info
    console.log('Loading dataset...');
    const dataset = await getDataset(datasetId);
    const priceInTFIL = formatPrice(dataset.price);
    
    // 2. Check if already purchased
    const alreadyOwns = await hasAccess(datasetId, buyerAddress);
    if (alreadyOwns) {
      console.log('You already own this dataset');
      return { alreadyOwned: true };
    }
    
    // 3. Purchase dataset
    console.log(`Purchasing for ${priceInTFIL} tFIL...`);
    const tx = await purchaseDataset(datasetId, priceInTFIL);
    await tx.wait();
    
    // 4. Verify access granted
    const hasAccessNow = await hasAccess(datasetId, buyerAddress);
    if (!hasAccessNow) {
      throw new Error('Purchase succeeded but access not granted');
    }
    
    console.log('Purchase complete!');
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('Purchase failed:', error.message);
    throw error;
  }
}
```

## Environment Variables

Make sure to set the contract address in your `.env` file:

```env
VITE_CONTRACT_ADDRESS=0x8F61BF10258AB489d841B5dEdB49A98f738Cc430
```

If not set, the wrapper will use the default deployed address.

## Network Configuration

The contract is deployed on Filecoin FVM Calibration testnet:
- Chain ID: 314159
- RPC URL: https://api.calibration.node.glif.io/rpc/v1
- Block Explorer: https://calibration.filfox.info

Make sure your wallet is connected to this network before calling contract functions.
