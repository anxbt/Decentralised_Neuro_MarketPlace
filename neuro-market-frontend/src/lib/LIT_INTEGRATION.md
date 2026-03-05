# Lit Protocol Integration Guide

This document explains how to use the Lit Protocol integration in NeuroMarket for client-side encryption and decryption of EEG datasets.

## Overview

The Lit Protocol integration provides:
- **Client-side encryption**: Files are encrypted in the browser before upload
- **On-chain access control**: Decryption requires verified ownership via smart contract
- **DatilDev network**: Free tier for development and testing
- **Session-based authentication**: Secure authentication using wallet signatures

## Architecture

```
┌─────────────┐
│   Browser   │
│             │
│  ┌───────┐  │     ┌──────────────┐
│  │ File  │──┼────▶│ Lit Protocol │
│  └───────┘  │     │  Encryption  │
│             │     └──────────────┘
│             │            │
│             │            ▼
│             │     ┌──────────────┐
│             │     │   Pinata     │
│             │     │    IPFS      │
│             │     └──────────────┘
└─────────────┘
       │
       │ Download Request
       ▼
┌─────────────┐
│   Smart     │
│  Contract   │──────▶ hasAccess(datasetId, buyer)
│             │       returns bool
└─────────────┘
       │
       │ Access Granted
       ▼
┌─────────────┐
│ Lit Protocol│
│  Decryption │
└─────────────┘
```

## Setup

### 1. Initialize the Client

Initialize the Lit Protocol client during app startup with your smart contract address:

```typescript
import { initializeLitClient, connectLit } from '@/lib/lit';

// In your app initialization (e.g., App.tsx or main.tsx)
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

initializeLitClient(contractAddress, 'filecoin');
await connectLit();
```

### 2. Environment Variables

Add to your `.env` file:

```env
VITE_CONTRACT_ADDRESS=0x... # Your deployed NeuroMarketplace contract address
```

## Usage Examples

### Encrypting a File

```typescript
import { getLitClient } from '@/lib/lit';

async function encryptDataset(file: File, datasetId: string) {
  const litClient = getLitClient();
  
  try {
    const { ciphertext, dataToEncryptHash } = await litClient.encryptFile(
      file,
      datasetId
    );
    
    // Store ciphertext and dataToEncryptHash
    // These will be needed for decryption
    return { ciphertext, dataToEncryptHash };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw error;
  }
}
```

### Decrypting a File

```typescript
import { getLitClient } from '@/lib/lit';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

async function decryptDataset(
  ciphertext: string,
  dataToEncryptHash: string,
  datasetId: string,
  fileName: string,
  fileType: string
) {
  const litClient = getLitClient();
  const { address } = useAccount();
  
  // Get signer from wallet
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  try {
    const decryptedFile = await litClient.decryptFile(
      ciphertext,
      dataToEncryptHash,
      datasetId,
      address!,
      signer,
      fileName,
      fileType
    );
    
    // Trigger download
    const url = URL.createObjectURL(decryptedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Decryption failed:', error);
    // User likely doesn't have access
    throw new Error('You do not have access to this dataset');
  }
}
```

### Encrypting a String (for testing)

```typescript
import { getLitClient } from '@/lib/lit';

async function encryptMessage(message: string, datasetId: string) {
  const litClient = getLitClient();
  
  const { ciphertext, dataToEncryptHash } = await litClient.encryptMessage(
    message,
    datasetId
  );
  
  return { ciphertext, dataToEncryptHash };
}
```

### Decrypting a String

```typescript
import { getLitClient } from '@/lib/lit';

async function decryptMessage(
  ciphertext: string,
  dataToEncryptHash: string,
  datasetId: string,
  walletAddress: string,
  signer: ethers.Signer
) {
  const litClient = getLitClient();
  
  const decryptedMessage = await litClient.decryptMessage(
    ciphertext,
    dataToEncryptHash,
    datasetId,
    walletAddress,
    signer
  );
  
  return decryptedMessage;
}
```

## Access Control Flow

1. **Encryption**: When a researcher uploads a dataset, the file is encrypted with access control conditions that reference the smart contract's `hasAccess` function.

2. **Purchase**: When a buyer purchases a dataset, the smart contract records their access in the `accessControl` mapping.

3. **Decryption**: When a buyer attempts to decrypt:
   - Lit Protocol calls the smart contract's `hasAccess(datasetId, buyerAddress)` function
   - If the function returns `true`, decryption proceeds
   - If the function returns `false`, decryption is denied

## Access Control Conditions

The access control conditions are automatically configured to check:

```solidity
// Smart contract function that Lit Protocol calls
function hasAccess(string memory datasetId, address buyer) 
    external 
    view 
    returns (bool) 
{
    return accessControl[datasetId][buyer];
}
```

The Lit Protocol configuration:
```typescript
{
  contractAddress: "0x...", // Your NeuroMarketplace contract
  functionName: "hasAccess",
  functionParams: [datasetId, ":userAddress"],
  chain: "filecoin",
  returnValueTest: {
    comparator: "=",
    value: "true"
  }
}
```

## Error Handling

### Common Errors

1. **"Lit Protocol client not initialized"**
   - Solution: Call `initializeLitClient()` before using the client

2. **"Failed to connect to Lit Protocol network"**
   - Solution: Check internet connection and try again

3. **"Failed to decrypt data. You may not have access to this dataset."**
   - Solution: Verify the user has purchased the dataset on-chain

4. **"Contract address is required to initialize Lit Protocol"**
   - Solution: Ensure `VITE_CONTRACT_ADDRESS` is set in your `.env` file

### Error Handling Pattern

```typescript
try {
  const result = await litClient.encryptFile(file, datasetId);
  // Handle success
} catch (error) {
  if (error.message.includes('not initialized')) {
    // Reinitialize client
    await initializeLitClient(contractAddress);
  } else if (error.message.includes('access')) {
    // Show access denied message to user
    alert('You do not have access to this dataset');
  } else {
    // Generic error handling
    console.error('Operation failed:', error);
  }
}
```

## Best Practices

1. **Initialize Once**: Call `initializeLitClient()` once during app startup, not before each operation.

2. **Connection Management**: The client automatically manages connections. Don't call `connect()` repeatedly.

3. **Session Signatures**: Session signatures are created automatically when needed. They're cached for performance.

4. **Error Messages**: Always provide user-friendly error messages, especially for access denial.

5. **Cleanup**: Call `disconnectLit()` when the app unmounts to clean up resources.

## Testing

The integration includes comprehensive unit tests. Run them with:

```bash
pnpm test lit.test.ts
```

Tests cover:
- Client initialization
- Access control condition creation
- Configuration validation
- Multiple dataset ID handling

## Network Configuration

The integration uses the **DatilDev** network:
- **Network**: `LIT_NETWORK.DatilDev`
- **Cost**: Free tier (no capacity credits required for basic operations)
- **Purpose**: Development and testing
- **Chain**: Filecoin Calibration testnet (chainId 314159)

For production, you would migrate to:
- **Network**: `LIT_NETWORK.Datil`
- **Cost**: Requires capacity credits
- **Purpose**: Production applications

## Security Considerations

1. **Client-side Only**: Encryption happens entirely in the browser. Files never leave unencrypted.

2. **On-chain Verification**: Access control is enforced by the blockchain, not by the frontend.

3. **No Key Storage**: Encryption keys are generated and managed by Lit Protocol nodes, not stored locally.

4. **Session Security**: Session signatures expire and must be regenerated periodically.

## Troubleshooting

### Connection Issues

If you experience connection issues:

```typescript
import { disconnectLit, connectLit } from '@/lib/lit';

// Reconnect
await disconnectLit();
await connectLit();
```

### Stale Sessions

If you get authentication errors:

```typescript
// Clear local storage and reconnect
localStorage.clear();
await disconnectLit();
await connectLit();
```

## References

- [Lit Protocol Documentation](https://developer.litprotocol.com/)
- [DatilDev Network Guide](https://datil.developer.litprotocol.com/connecting-to-a-lit-network/connecting)
- [Access Control Conditions](https://datil.developer.litprotocol.com/sdk/access-control/evm/custom-contract-calls)
- [NeuroMarket Design Document](/.kiro/specs/neuromarket/design.md)
