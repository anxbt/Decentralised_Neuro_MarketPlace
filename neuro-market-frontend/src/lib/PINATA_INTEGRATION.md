# Pinata IPFS Integration

This module provides a simple interface for uploading and retrieving files from IPFS using Pinata's service.

## Setup

1. Get your Pinata JWT token from [Pinata Dashboard](https://app.pinata.cloud/developers/api-keys)
2. Add to your `.env` file:

```env
VITE_PINATA_JWT=your_jwt_token_here
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
```

## Usage

### Upload a File

```typescript
import { pinFileToPinata } from '@/lib/pinata';

// Basic upload
const file = new File([encryptedBlob], "dataset.enc");
const result = await pinFileToPinata(file);
console.log("CID:", result.cid);

// Upload with metadata
const result = await pinFileToPinata(file, {
  name: "my-encrypted-dataset",
  keyvalues: {
    datasetId: "123",
    encrypted: "true",
    researcher: "0xABC..."
  }
});
```

### Retrieve a File

```typescript
import { fetchFromIPFS } from '@/lib/pinata';

const cid = "bafkreib...";
const encryptedBlob = await fetchFromIPFS(cid);
// Now decrypt with Lit Protocol
```

### Get Gateway URL

```typescript
import { getGatewayUrl } from '@/lib/pinata';

const cid = "bafkreib...";
const url = await getGatewayUrl(cid);
// Returns: "https://gateway.pinata.cloud/ipfs/bafkreib..."
```

### Check Configuration

```typescript
import { isPinataConfigured } from '@/lib/pinata';

if (!isPinataConfigured()) {
  console.error("Pinata is not configured. Please set environment variables.");
}
```

## API Reference

### `pinFileToPinata(file, metadata?)`

Uploads a file to IPFS via Pinata.

**Parameters:**
- `file: File` - The file to upload (typically an encrypted blob)
- `metadata?: object` - Optional metadata
  - `name?: string` - Custom name for the file
  - `keyvalues?: Record<string, string>` - Key-value pairs for searching

**Returns:** `Promise<PinataUploadResponse>`
- `id: string` - Pinata file ID
- `cid: string` - IPFS Content Identifier
- `name: string` - File name
- `size: number` - File size in bytes
- `created_at: string` - Upload timestamp
- `mime_type: string` - File MIME type

### `fetchFromIPFS(cid)`

Retrieves a file from IPFS using its CID.

**Parameters:**
- `cid: string` - The IPFS Content Identifier

**Returns:** `Promise<Blob>` - The file as a Blob

### `getGatewayUrl(cid)`

Generates a public gateway URL for a CID.

**Parameters:**
- `cid: string` - The IPFS Content Identifier

**Returns:** `Promise<string>` - The full gateway URL

### `isPinataConfigured()`

Checks if Pinata is properly configured with JWT and gateway.

**Returns:** `boolean` - True if configured

## Error Handling

All functions throw descriptive errors on failure:

```typescript
try {
  const result = await pinFileToPinata(file);
} catch (error) {
  console.error("Upload failed:", error.message);
  // Handle error (show user message, retry, etc.)
}
```

## Integration with Upload Flow

The typical upload flow in NeuroMarket:

1. User selects EEG file
2. **Encrypt** file with Lit Protocol → encrypted blob
3. **Upload** encrypted blob to Pinata → CID
4. Register CID in smart contract
5. Store metadata in backend

```typescript
// Example upload flow
import { encryptFile } from '@/lib/lit';
import { pinFileToPinata } from '@/lib/pinata';
import { registerDataset } from '@/lib/contract';

async function uploadDataset(file: File, metadata: DatasetMetadata) {
  // 1. Encrypt
  const { encryptedFile } = await encryptFile(file, metadata.datasetId);
  
  // 2. Upload to IPFS
  const { cid } = await pinFileToPinata(
    new File([encryptedFile], `${metadata.datasetId}.enc`),
    {
      name: metadata.title,
      keyvalues: {
        datasetId: metadata.datasetId,
        encrypted: "true"
      }
    }
  );
  
  // 3. Register on-chain
  const txHash = await registerDataset(metadata.datasetId, cid, metadata.price);
  
  return { cid, txHash };
}
```

## Free Tier Limits

Pinata free tier includes:
- 1 GB storage
- Unlimited bandwidth
- JWT authentication (no credit card required)

For production use, consider upgrading to a paid plan.

## Troubleshooting

### "VITE_PINATA_JWT is not set"

Make sure your `.env` file contains the JWT token and restart the dev server.

### "Failed to pin file to IPFS"

- Check your JWT token is valid
- Verify you haven't exceeded free tier limits
- Check network connectivity

### "Failed to fetch file from IPFS"

- Verify the CID is correct
- Check the file was successfully pinned
- Try accessing the gateway URL directly in a browser

## Related Documentation

- [Pinata Official Docs](https://docs.pinata.cloud)
- [IPFS Documentation](https://docs.ipfs.tech)
- [Lit Protocol Integration](./LIT_INTEGRATION.md)
