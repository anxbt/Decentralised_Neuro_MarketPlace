/**
 * Pinata IPFS Integration
 * 
 * This module provides functions for uploading encrypted files to IPFS via Pinata
 * and retrieving them through the Pinata gateway.
 * 
 * Requirements validated: 12.1, 12.2, 12.3, 12.5, 12.6
 * 
 * @example Usage in Upload Flow
 * ```typescript
 * import { pinFileToPinata } from './lib/pinata';
 * import { encryptFile } from './lib/lit';
 * 
 * // 1. Encrypt the file first
 * const { encryptedFile } = await encryptFile(originalFile, datasetId);
 * 
 * // 2. Pin to IPFS with metadata
 * const result = await pinFileToPinata(encryptedFile, {
 *   name: `${datasetTitle}-encrypted`,
 *   keyvalues: {
 *     datasetId: datasetId,
 *     researcherAddress: walletAddress,
 *     title: datasetTitle,
 *     encrypted: 'true'
 *   }
 * });
 * 
 * // 3. Use the CID for smart contract registration
 * console.log('IPFS CID:', result.cid);
 * await registerDataset(datasetId, result.cid, price);
 * ```
 */

import { PinataSDK } from "pinata";

// Environment variables
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY;

if (!PINATA_JWT) {
  console.warn("VITE_PINATA_JWT is not set. Pinata functionality will not work.");
}

if (!PINATA_GATEWAY) {
  console.warn("VITE_PINATA_GATEWAY is not set. File retrieval may not work correctly.");
}

/**
 * Initialize Pinata SDK client with JWT authentication
 */
export const pinata = new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY,
});

/**
 * Response from Pinata after successful file upload
 */
export interface PinataUploadResponse {
  id: string;
  name: string;
  cid: string;
  created_at: string;
  size: number;
  number_of_files: number;
  mime_type: string;
  group_id: string | null;
}

/**
 * Upload a file to IPFS via Pinata
 * 
 * @param file - The file to upload (typically an encrypted blob)
 * @param metadata - Optional metadata including name and key-value pairs
 * @returns Promise resolving to the upload response with CID
 * @throws Error with specific message for rate limits, authentication, or network issues
 * 
 * Requirements validated: 2.3, 2.4, 12.2, 12.3, 12.5, 12.6
 * 
 * @example
 * ```typescript
 * const encryptedFile = new File([encryptedBlob], "dataset.enc");
 * const result = await pinFileToPinata(encryptedFile, {
 *   name: "my-dataset-encrypted",
 *   keyvalues: { 
 *     datasetId: "123", 
 *     researcherAddress: "0x...",
 *     title: "EEG Dataset"
 *   }
 * });
 * console.log("IPFS CID:", result.cid);
 * ```
 */
export async function pinFileToPinata(
  file: File,
  metadata?: {
    name?: string;
    keyvalues?: Record<string, string>;
  }
): Promise<PinataUploadResponse> {
  try {
    // Validate inputs
    if (!file) {
      throw new Error("File is required for upload");
    }

    if (!PINATA_JWT) {
      throw new Error("Pinata JWT is not configured. Please set VITE_PINATA_JWT environment variable.");
    }

    let upload = pinata.upload.public.file(file);

    // Add optional metadata
    if (metadata?.name) {
      upload = upload.name(metadata.name);
    }

    if (metadata?.keyvalues) {
      upload = upload.keyvalues(metadata.keyvalues);
    }

    const result = await upload;
    return result as PinataUploadResponse;
  } catch (error) {
    console.error("Error pinning file to Pinata:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Rate limit errors (Requirement 12.5)
      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        throw new Error(
          "Pinata rate limit exceeded. Please wait a moment and try again."
        );
      }
      
      // Authentication errors
      if (errorMessage.includes("unauthorized") || errorMessage.includes("401") || errorMessage.includes("403")) {
        throw new Error(
          "Pinata authentication failed. Please check your API credentials."
        );
      }
      
      // Network errors
      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        throw new Error(
          "Network error while uploading to IPFS. Please check your connection and try again."
        );
      }
      
      // Generic error with original message
      throw new Error(
        `Failed to pin file to IPFS: ${error.message}`
      );
    }
    
    throw new Error(
      "Failed to pin file to IPFS: Unknown error occurred"
    );
  }
}

/**
 * Retrieve a file from IPFS using its CID with retry capability
 * 
 * @param cid - The IPFS Content Identifier
 * @param options - Optional configuration for retry behavior
 * @returns Promise resolving to the file as a Blob
 * @throws Error with specific message for validation, network, or retrieval issues
 * 
 * Requirements validated: 6.2, 12.4
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const encryptedBlob = await fetchFromIPFS("bafkreib...");
 * 
 * // With custom retry configuration
 * const encryptedBlob = await fetchFromIPFS("bafkreib...", {
 *   maxRetries: 5,
 *   retryDelay: 2000
 * });
 * ```
 */
export async function fetchFromIPFS(
  cid: string,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<Blob> {
  // Validate CID
  if (!cid || typeof cid !== 'string' || cid.trim().length === 0) {
    throw new Error("Invalid CID: CID must be a non-empty string");
  }

  // Validate gateway configuration
  if (!PINATA_GATEWAY) {
    throw new Error("Pinata gateway is not configured. Please set VITE_PINATA_GATEWAY environment variable.");
  }

  const maxRetries = options?.maxRetries ?? 3;
  const retryDelay = options?.retryDelay ?? 1000;
  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Log retry attempts (except first attempt)
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries} for CID: ${cid}`);
      }

      const data = await pinata.gateways.public.get(cid);
      
      // The SDK returns the data directly, convert to Blob
      if (data instanceof Blob) {
        return data;
      }
      
      // If it's not a Blob, try to convert it
      const blob = new Blob([data as BlobPart]);
      return blob;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      
      // Log the error
      console.error(`Error fetching file from IPFS (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // Check if this is a non-retryable error
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Don't retry on validation errors or 404s
        if (
          errorMessage.includes("invalid cid") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("404")
        ) {
          throw new Error(
            `File not found on IPFS. The CID "${cid}" may be invalid or the file may not be pinned.`
          );
        }
        
        // Don't retry on authentication errors
        if (errorMessage.includes("unauthorized") || errorMessage.includes("401") || errorMessage.includes("403")) {
          throw new Error(
            "Pinata authentication failed. Please check your gateway configuration."
          );
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw new Error(
    `Failed to fetch file from IPFS after ${maxRetries + 1} attempts. ${
      lastError ? `Last error: ${lastError.message}` : ""
    }. Please check your network connection and try again.`
  );
}

/**
 * Get a public gateway URL for a CID
 * 
 * @param cid - The IPFS Content Identifier
 * @returns The full gateway URL
 * 
 * @example
 * ```typescript
 * const url = getGatewayUrl("bafkreib...");
 * // Returns: "https://gateway.pinata.cloud/ipfs/bafkreib..."
 * ```
 */
export async function getGatewayUrl(cid: string): Promise<string> {
  try {
    const url = await pinata.gateways.public.convert(cid);
    return url;
  } catch (error) {
    console.error("Error generating gateway URL:", error);
    // Fallback to manual URL construction
    return `${PINATA_GATEWAY}/ipfs/${cid}`;
  }
}

/**
 * Check if Pinata is properly configured
 * 
 * @returns true if JWT and gateway are configured
 */
export function isPinataConfigured(): boolean {
  return Boolean(PINATA_JWT && PINATA_GATEWAY);
}
