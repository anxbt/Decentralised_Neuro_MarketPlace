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
import { createWalletClient, custom } from 'viem';
import { filecoinCalibration } from '@/config/wagmi';

// Contract address for access control verification
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b';

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
    } catch (error) {
      console.error('[Lit v8] Failed to connect:', error);
      this.litClient = null;
      throw new Error('Lit Protocol is unavailable. Cannot encrypt securely. Please try again later.');
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Get the connected Lit client
   */
  private async getClient(): Promise<any> {
    if (!this.litClient) {
      await this.connect();
    }
    if (!this.litClient) {
      throw new Error('Lit Protocol is unavailable. Cannot encrypt securely. Upload blocked for your protection.');
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

  private async createEoaAuthContext(signer: ethers.Signer): Promise<any> {
    if (!(window as any).ethereum) {
      throw new Error('No Ethereum provider found. Please connect a wallet.');
    }

    const address = await signer.getAddress();
    const walletClient = createWalletClient({
      account: address as `0x${string}`,
      chain: filecoinCalibration,
      transport: custom((window as any).ethereum),
    });

    return await this.authManager.createEoaAuthContext({
      config: { account: walletClient },
      authConfig: {
        domain: window.location.hostname,
        statement: 'Authorize Lit session for NeuroMarket dataset decryption',
        resources: [['access-control-condition-decryption', '*']],
        expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      litClient: await this.getClient(),
    });
  }

  /**
   * Encrypt a string with Lit Protocol v8
   * In v8, encryption doesn't require authentication — only decryption does
   * 
   * SECURITY: No fallback encryption. If Lit Protocol is unavailable,
   * this method throws an error and blocks the upload. Never silently
   * degrade to local encryption — that would compromise access control.
   */
  async encryptMessage(
    message: string,
    datasetId: string
  ): Promise<EncryptionResult> {
    const client = await this.getClient();

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
      const eoaAuthContext = await this.createEoaAuthContext(signer);

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

  async decryptMessage(
    ciphertext: string,
    dataToEncryptHash: string,
    datasetId: string,
    signer: ethers.Signer
  ): Promise<string> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Lit Protocol client not available for decryption.');
    }

    const unifiedAccessControlConditions = this.createUnifiedAccessControlConditions(datasetId);

    try {
      const eoaAuthContext = await this.createEoaAuthContext(signer);

      const decrypted = await client.decrypt({
        data: { ciphertext, dataToEncryptHash },
        unifiedAccessControlConditions,
        authContext: eoaAuthContext,
        chain: this.config.chain,
      });

      return typeof decrypted === 'string' ? decrypted : decrypted.decryptedData;
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
      throw new Error('Failed to decrypt data. Please ensure you have purchased access.');
    }
  }
}

// ============================================================
// Module-level singleton and convenience exports
// ============================================================

const DEFAULT_CONFIG: LitConfig = {
  contractAddress: CONTRACT_ADDRESS,
  chain: 'filecoinCalibrationTestnet',
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
export function initializeLitClient(contractAddress: string, chain: string = 'filecoinCalibrationTestnet'): void {
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

export async function encryptMessage(
  message: string,
  datasetId: string
): Promise<EncryptionResult> {
  const client = getLitClient();
  return await client.encryptMessage(message, datasetId);
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

export async function decryptMessage(
  ciphertext: string,
  dataToEncryptHash: string,
  datasetId: string,
  signer: ethers.Signer
): Promise<string> {
  const client = getLitClient();
  return await client.decryptMessage(ciphertext, dataToEncryptHash, datasetId, signer);
}

export { LitProtocolClient };
