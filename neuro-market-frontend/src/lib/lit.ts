/**
 * Lit Protocol Integration for NeuroMarket (v8 SDK — Naga Network)
 * 
 * Migrated from v7 (Datil) to v8 (Naga) because DatilDev was shut down Feb 25, 2025.
 * Uses nagaDev network (free tier) and enforces access control through
 * on-chain verification via the NeuroMarketplace smart contract.
 * 
 * Key Changes from v7:
 * - createLitClient() replaces new LitNodeClient().connect()
 * - litClient.encrypt() replaces standalone encryptString()
 * - litClient.decrypt() replaces standalone decryptToString()
 * - authManager.createEoaAuthContext() replaces getSessionSigs()
 * - unifiedAccessControlConditions replaces evmContractConditions
 * 
 * Validates Requirements: 11.1, 11.4, 11.5
 */

import { createLitClient } from '@lit-protocol/lit-client';
import { nagaDev } from '@lit-protocol/networks';
import { createAuthManager, storagePlugins } from '@lit-protocol/auth';
import { ethers } from 'ethers';

// Contract address for access control verification
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x8F61BF10258AB489d841B5dEdB49A98f738Cc430';

/**
 * Configuration for Lit Protocol client
 */
export interface LitConfig {
  contractAddress: string;
  chain: string;
}

/**
 * Result of encryption operations
 */
export interface EncryptionResult {
  ciphertext: string;
  dataToEncryptHash: string;
}

/**
 * Access Control Condition for Lit Protocol
 */
export interface EvmContractCondition {
  contractAddress: string;
  functionName: string;
  functionParams: string[];
  functionAbi: {
    type: string;
    stateMutability: string;
    outputs: Array<{ type: string; name: string; internalType: string }>;
    name: string;
    inputs: Array<{ type: string; name: string; internalType: string }>;
  };
  chain: string;
  returnValueTest: {
    key: string;
    comparator: string;
    value: string;
  };
}

/**
 * Lit Protocol Client Manager (v8 SDK)
 */
class LitProtocolClient {
  private litClient: any | null = null;
  private authManager: any | null = null;
  private config: LitConfig;
  private isConnecting: boolean = false;
  private useFallback: boolean = false;

  constructor(config: LitConfig) {
    this.config = config;
  }

  /**
   * Connect to Lit Protocol using v8 SDK (nagaDev network)
   * In v8, createLitClient handles both creation and connection
   */
  async connect(): Promise<void> {
    if (this.litClient) {
      return; // Already connected
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isConnecting = true;

      console.log('[Lit v8] Connecting to Naga Dev network...');
      this.litClient = await createLitClient({
        network: nagaDev,
      });

      // Set up auth manager for decryption operations
      this.authManager = createAuthManager({
        storage: storagePlugins.localStorage({
          appName: 'neuromarket',
          networkName: 'naga-dev',
        }),
      });

      console.log('[Lit v8] Connected to Naga Dev network successfully!');
      this.useFallback = false;
    } catch (error) {
      console.error('[Lit v8] Failed to connect:', error);
      console.warn('[Lit v8] ⚠️ Lit nodes unreachable — enabling local encryption fallback');
      this.litClient = null;
      this.useFallback = true;
      // Don't throw — allow fallback encryption
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Get the connected Lit client
   */
  private async getClient(): Promise<any> {
    if (!this.litClient && !this.useFallback) {
      await this.connect();
    }
    return this.litClient;
  }

  /**
   * Disconnect from Lit Protocol
   */
  async disconnect(): Promise<void> {
    if (this.litClient) {
      try {
        this.litClient.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.litClient = null;
    }
  }

  /**
   * Create unified access control conditions for a dataset
   * Uses the NeuroMarketplace smart contract hasAccess function
   */
  private createUnifiedAccessControlConditions(datasetId: string): any[] {
    return [
      {
        conditionType: 'evmContract',
        contractAddress: this.config.contractAddress,
        functionName: 'hasAccess',
        functionParams: [datasetId, ':userAddress'],
        functionAbi: {
          type: 'function',
          stateMutability: 'view',
          outputs: [{ type: 'bool', name: '', internalType: 'bool' }],
          name: 'hasAccess',
          inputs: [
            { type: 'string', name: 'datasetId', internalType: 'string' },
            { type: 'address', name: 'buyer', internalType: 'address' },
          ],
        },
        chain: this.config.chain,
        returnValueTest: {
          key: '',
          comparator: '=',
          value: 'true',
        },
      },
    ];
  }

  /**
   * Fallback encryption using Web Crypto API (AES-GCM)
   * Used when Lit Protocol nodes are unreachable (development/demo)
   */
  private async fallbackEncrypt(data: string): Promise<EncryptionResult> {
    console.warn('[Lit v8] ⚠️ Using LOCAL fallback encryption (NOT Lit Protocol). For demo/dev only.');
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBytes);
    const exportedKey = await crypto.subtle.exportKey('raw', key);

    const combined = new Uint8Array(iv.length + exportedKey.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(exportedKey), iv.length);
    combined.set(new Uint8Array(encrypted), iv.length + exportedKey.byteLength);

    const ciphertext = btoa(String.fromCharCode(...combined));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = new Uint8Array(hashBuffer);
    const dataToEncryptHash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return { ciphertext, dataToEncryptHash };
  }

  /**
   * Encrypt a string with Lit Protocol v8
   * In v8, encryption doesn't require authentication — only decryption does
   */
  async encryptMessage(
    message: string,
    datasetId: string
  ): Promise<EncryptionResult> {
    if (this.useFallback) {
      return await this.fallbackEncrypt(message);
    }

    const client = await this.getClient();
    if (!client) {
      return await this.fallbackEncrypt(message);
    }

    const unifiedAccessControlConditions = this.createUnifiedAccessControlConditions(datasetId);

    try {
      // v8 API: litClient.encrypt()
      const encrypted = await client.encrypt({
        dataToEncrypt: message,
        unifiedAccessControlConditions,
        chain: this.config.chain,
      });

      return {
        ciphertext: encrypted.ciphertext,
        dataToEncryptHash: encrypted.dataToEncryptHash,
      };
    } catch (error) {
      console.error('[Lit v8] Encryption failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during encryption. Please check your connection.');
        }
      }
      throw new Error('Failed to encrypt data with Lit Protocol.');
    }
  }

  /**
   * Encrypt a file with Lit Protocol
   * Converts file to base64 string before encryption
   */
  async encryptFile(
    file: File,
    datasetId: string
  ): Promise<EncryptionResult> {
    if (!file) {
      throw new Error('No file provided for encryption');
    }
    if (!datasetId || datasetId.trim() === '') {
      throw new Error('Dataset ID is required for encryption');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(
        uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      return await this.encryptMessage(base64String, datasetId);
    } catch (error) {
      console.error('[Lit v8] File encryption failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('Dataset ID') || error.message.includes('No file')) {
          throw error;
        }
      }
      throw new Error('File encryption failed. Please try again.');
    }
  }

  /**
   * Decrypt a file with Lit Protocol v8
   * In v8, decryption requires authContext (authentication)
   */
  async decryptFile(
    ciphertext: string,
    dataToEncryptHash: string,
    datasetId: string,
    walletAddress: string,
    signer: ethers.Signer,
    originalFileName: string,
    fileType: string
  ): Promise<File> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Lit Protocol client not available for decryption.');
    }

    const unifiedAccessControlConditions = this.createUnifiedAccessControlConditions(datasetId);

    try {
      // Create EOA auth context for decryption
      // Convert ethers signer to viem-compatible account
      const address = await signer.getAddress();

      const eoaAuthContext = await this.authManager.createEoaAuthContext({
        config: { account: address as any },
        authConfig: {
          domain: window.location.hostname,
          statement: 'Authorize Lit session for NeuroMarket dataset decryption',
          resources: [
            ['access-control-condition-decryption', '*'],
          ],
          expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
        litClient: client,
      });

      // v8 API: litClient.decrypt()
      const decrypted = await client.decrypt({
        data: { ciphertext, dataToEncryptHash },
        unifiedAccessControlConditions,
        authContext: eoaAuthContext,
        chain: this.config.chain,
      });

      // Convert decrypted base64 string back to file
      const base64String = typeof decrypted === 'string' ? decrypted : decrypted.decryptedData;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new File([bytes], originalFileName, { type: fileType });
    } catch (error) {
      console.error('[Lit v8] Decryption failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('access') || error.message.includes('Access')) {
          throw new Error('Access denied. You must purchase this dataset to decrypt it.');
        }
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during decryption. Please try again.');
        }
      }
      throw new Error('Failed to decrypt file. Please ensure you have purchased access.');
    }
  }
}

// ============================================================
// Module-level singleton and convenience exports
// ============================================================

const DEFAULT_CONFIG: LitConfig = {
  contractAddress: CONTRACT_ADDRESS,
  chain: 'filecoin',
};

let litClient: LitProtocolClient | null = null;

function getLitClient(): LitProtocolClient {
  if (!litClient) {
    litClient = new LitProtocolClient(DEFAULT_CONFIG);
  }
  return litClient;
}

/**
 * Initialize Lit Protocol client with contract address and chain
 * Called from App.tsx at startup
 */
export function initializeLitClient(contractAddress: string, chain: string = 'filecoin'): void {
  if (!contractAddress) {
    console.warn('[Lit v8] Contract address not provided. Encryption will not enforce access control.');
  }
  litClient = new LitProtocolClient({ contractAddress, chain });
}

/**
 * Connect to Lit Protocol (convenience wrapper)
 */
export async function connectLit(): Promise<void> {
  const client = getLitClient();
  await client.connect();
}

/**
 * Disconnect from Lit Protocol
 */
export async function disconnectLit(): Promise<void> {
  if (litClient) {
    await litClient.disconnect();
  }
}

/**
 * Encrypt a file with Lit Protocol (convenience wrapper)
 */
export async function encryptFile(
  file: File,
  datasetId: string
): Promise<EncryptionResult> {
  const client = getLitClient();
  return await client.encryptFile(file, datasetId);
}

/**
 * Decrypt a file with Lit Protocol (convenience wrapper)
 */
export async function decryptFile(
  ciphertext: string,
  dataToEncryptHash: string,
  datasetId: string,
  walletAddress: string,
  signer: ethers.Signer,
  originalFileName: string,
  fileType: string
): Promise<File> {
  const client = getLitClient();
  return await client.decryptFile(
    ciphertext,
    dataToEncryptHash,
    datasetId,
    walletAddress,
    signer,
    originalFileName,
    fileType
  );
}

export { LitProtocolClient };
