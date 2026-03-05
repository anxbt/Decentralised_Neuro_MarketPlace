/**
 * Synapse SDK Integration for NeuroMarket
 * 
 * This module provides Filecoin storage with PDP (Proof of Data Possession) proofs
 * using the Synapse SDK. Storage is paid with USDFC tokens (NOT tFIL).
 * 
 * Key Features:
 * - Upload encrypted files to Filecoin storage
 * - Returns PieceCID (cryptographically bound to PDP proof set)
 * - Download files using PieceCID
 * - Check USDFC balance and storage allowances
 * - One-time setup: deposit USDFC and approve Pandora service
 * 
 * Validates Requirements: 3.1, 3.2, 10.1
 */

import { ethers } from 'ethers';
import { custom } from 'viem';

// Lazy-load Synapse SDK to prevent Vite from bundling Node-specific
// dependencies at build time (which causes a blank page crash).
let _synapseSdk: typeof import('@filoz/synapse-sdk') | null = null;
async function getSynapseSdk() {
  if (!_synapseSdk) {
    _synapseSdk = await import('@filoz/synapse-sdk');
  }
  return _synapseSdk;
}

/**
 * Result of upload operation
 */
export interface UploadResult {
  pieceCid: string;
  size: number;
}

/**
 * Balance information for storage payments
 */
export interface StorageBalances {
  usdfc: string; // USDFC balance in human-readable format
  deposited: string; // USDFC deposited to Payments contract
  allowance: string; // Approved allowance for Pandora service
}

/**
 * Synapse Storage Manager
 * Handles initialization, uploads, downloads, and payment management
 */
class SynapseStorageManager {
  private synapse: any | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private isInitializing: boolean = false;

  /**
   * Initialize Synapse SDK with viem walletClient + custom transport
   * Must be called before any other operations
   */
  async initialize(): Promise<void> {
    if (this.synapse) {
      return; // Already initialized
    }

    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isInitializing = true;

      if (!(window as any).ethereum) {
        throw new Error('No Ethereum provider found. Please install MetaMask or another wallet.');
      }

      // Get wallet address via ethers (RainbowKit uses ethers)
      this.provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await this.provider.getSigner();
      const address = await signer.getAddress();

      console.log('[Synapse] Initializing Synapse SDK with viem transport...');
      console.log('[Synapse] Wallet:', address);

      // Create Synapse with viem custom transport (required by SDK v0.38.0)
      // SDK auto-resolves Filecoin Calibration chain from transport
      const { Synapse } = await getSynapseSdk();
      this.synapse = Synapse.create({
        account: address as `0x${string}`,
        transport: custom((window as any).ethereum!),
      } as any);

      console.log('[Synapse] Connected to Filecoin Calibration network ✅');
    } catch (error) {
      console.error('[Synapse] Failed to initialize:', error);
      this.synapse = null;
      this.provider = null;
      throw new Error('Failed to initialize Synapse SDK. Please check your wallet connection.');
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get the initialized Synapse instance
   * Ensures initialization before returning
   */
  private async getSynapse(): Promise<any> {
    if (!this.synapse) {
      await this.initialize();
    }
    if (!this.synapse) {
      throw new Error('Failed to initialize Synapse SDK');
    }
    return this.synapse;
  }

  /**
   * Check if user has sufficient USDFC balance for storage
   * 
   * @param requiredAmount - Amount of USDFC needed (in human-readable format, e.g., "10")
   * @returns True if user has sufficient balance
   */
  async checkUSDFCBalance(requiredAmount: string): Promise<boolean> {
    try {
      const synapse = await this.getSynapse();
      const balances = await this.getBalances();

      const required = parseFloat(requiredAmount);
      const available = parseFloat(balances.usdfc);

      return available >= required;
    } catch (error) {
      console.error('[Synapse] Failed to check USDFC balance:', error);
      return false;
    }
  }

  /**
   * Get storage balances (USDFC, deposited, allowance)
   * 
   * @returns Balance information
   */
  async getBalances(): Promise<StorageBalances> {
    try {
      const synapse = await this.getSynapse();

      const { TOKENS } = await getSynapseSdk();

      // Get USDFC wallet balance
      const usdfcBalance = await synapse.payments.balance({ token: TOKENS.USDFC });

      // Get deposited balance via accountInfo
      // SDK returns: { funds, lockupCurrent, lockupRate, lockupLastSettledAt, availableFunds }
      const accountInfo = await synapse.payments.accountInfo({ token: TOKENS.USDFC });
      console.log('[Synapse] accountInfo returned:', accountInfo);
      const depositedBalance = accountInfo?.funds ?? BigInt(0);

      // Check service approval status
      // SDK returns: { isApproved, rateAllowance, lockupAllowance, rateUsage, lockupUsage }
      let isApproved = false;
      try {
        const approval = await synapse.payments.serviceApproval({ token: TOKENS.USDFC });
        console.log('[Synapse] serviceApproval returned:', approval);
        isApproved = approval?.isApproved ?? false;
      } catch (e) {
        console.warn('[Synapse] serviceApproval check failed:', e);
      }

      return {
        usdfc: ethers.formatUnits(usdfcBalance, 18),
        deposited: ethers.formatUnits(depositedBalance, 18),
        allowance: isApproved ? '1' : '0'
      };
    } catch (error) {
      console.error('[Synapse] Failed to get balances:', error);
      throw new Error('Failed to retrieve storage balances');
    }
  }

  /**
   * Deposit USDFC to Payments contract (one-time setup step 1)
   * 
   * @param amount - Amount of USDFC to deposit (in human-readable format, e.g., "10")
   * @returns Transaction hash
   */
  async depositUSDFC(amount: string): Promise<string> {
    try {
      const synapse = await this.getSynapse();

      const amountWei = ethers.parseUnits(amount, 18);
      console.log(`[Synapse] Depositing ${amount} USDFC...`);

      const { TOKENS } = await getSynapseSdk();
      // deposit now takes an options object
      const txHash = await synapse.payments.deposit({
        amount: BigInt(amountWei.toString()),
        token: TOKENS.USDFC
      });
      console.log('[Synapse] Deposit transaction submitted:', txHash);

      // Since the API returns a hash, we'd need a viem publicClient to wait for it.
      // But for hackathon demo we can just return the hash.
      return txHash;
    } catch (error) {
      console.error('[Synapse] Deposit failed:', error);

      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient USDFC balance. Please get USDFC from the faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc');
        }
        if (error.message.includes('user rejected')) {
          throw new Error('Transaction rejected by user');
        }
      }

      throw new Error('Failed to deposit USDFC. Please try again.');
    }
  }

  /**
   * Approve Pandora service as operator (one-time setup step 2)
   * 
   * @param rateAllowance - Rate allowance per epoch (e.g., "1")
   * @param totalAllowance - Total lockup allowance (e.g., "100")
   * @returns Transaction hash
   */
  async approvePandoraService(
    rateAllowance: string = "1",
    totalAllowance: string = "100"
  ): Promise<string> {
    try {
      const synapse = await this.getSynapse();

      const pandoraAddress = (synapse as any)._storageManager?.serviceProvider ?? '0x0000000000000000000000000000000000000000';

      const rateWei = BigInt(ethers.parseUnits(rateAllowance, 18).toString());
      const totalWei = BigInt(ethers.parseUnits(totalAllowance, 18).toString());

      console.log('[Synapse] Approving Pandora service...');
      // approveService takes an options object
      // maxLockupPeriod must be >= 86400 (required by the Pandora service)
      const txHash = await synapse.payments.approveService({
        rateAllowance: rateWei,
        lockupAllowance: totalWei,
        maxLockupPeriod: BigInt(86400)
      });
      console.log('[Synapse] Approval transaction submitted:', txHash);

      return txHash;
    } catch (error) {
      console.error('[Synapse] Approval failed:', error);

      if (error instanceof Error && error.message.includes('user rejected')) {
        throw new Error('Transaction rejected by user');
      }

      throw new Error('Failed to approve Pandora service. Please try again.');
    }
  }

  /**
   * Check if one-time setup is complete
   * 
   * @returns True if user has deposited USDFC and approved Pandora service
   */
  async isSetupComplete(): Promise<boolean> {
    try {
      const balances = await this.getBalances();
      const hasDeposit = parseFloat(balances.deposited) > 0;
      const hasApproval = balances.allowance !== '0';
      console.log(`[Synapse] Setup check: deposit=${hasDeposit} (${balances.deposited}), approved=${hasApproval}`);
      return hasDeposit && hasApproval;
    } catch (error) {
      console.error('[Synapse] Failed to check setup status:', error);
      return false;
    }
  }

  /**
   * Upload encrypted file to Filecoin storage
   * 
   * @param encryptedData - Encrypted file data (Buffer or Uint8Array)
   * @returns Upload result with PieceCID
   * @throws Error if upload fails or setup is incomplete
   * 
   * Validates Requirements: 3.1, 3.2
   */
  async uploadFile(encryptedData: Buffer | Uint8Array): Promise<UploadResult> {
    try {
      const synapse = await this.getSynapse();

      // Validate input
      if (!encryptedData || encryptedData.length === 0) {
        throw new Error('No data provided for upload');
      }

      // Check file size (max 200 MiB)
      const maxSize = 200 * 1024 * 1024; // 200 MiB in bytes
      if (encryptedData.length > maxSize) {
        throw new Error('File size exceeds 200 MiB limit');
      }

      console.log(`[Synapse] Uploading ${encryptedData.length} bytes to Filecoin storage...`);

      // Upload via Synapse storage manager (SDK v0.38.0 API)
      const result = await synapse.storage.upload(new Uint8Array(encryptedData));
      const pieceCid = result.pieceCid.toString();

      console.log('[Synapse] Upload complete! PieceCID:', pieceCid);

      return {
        pieceCid,
        size: encryptedData.length
      };
    } catch (error) {
      console.error('[Synapse] Upload failed:', error);

      if (error instanceof Error) {
        // Re-throw known errors
        if (error.message.includes('No data provided') ||
          error.message.includes('exceeds 200 MiB') ||
          error.message.includes('setup incomplete')) {
          throw error;
        }

        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during upload. Please check your connection and try again.');
        }

        // Insufficient funds
        if (error.message.includes('insufficient')) {
          throw new Error('Insufficient USDFC balance for storage. Please deposit more USDFC.');
        }
      }

      throw new Error('Failed to upload file to Filecoin storage. Please try again.');
    }
  }

  /**
   * Download file from Filecoin storage using PieceCID
   * 
   * @param pieceCid - PieceCID of the file to download
   * @returns Downloaded file data as Uint8Array
   * @throws Error if download fails
   * 
   * Validates Requirements: 6.2
   */
  async downloadFile(pieceCid: string): Promise<Uint8Array> {
    try {
      const synapse = await this.getSynapse();

      // Validate input
      if (!pieceCid || pieceCid.trim() === '') {
        throw new Error('Invalid PieceCID provided');
      }

      console.log('[Synapse] Downloading file with PieceCID:', pieceCid);

      // Download via Synapse storage manager (SDK v0.38.0 API)
      const response = await synapse.storage.download({ pieceCid });
      const data = new Uint8Array(await response.arrayBuffer());

      console.log('[Synapse] Download complete!', data.length, 'bytes');

      return data;
    } catch (error) {
      console.error('[Synapse] Download failed:', error);

      if (error instanceof Error) {
        // Invalid PieceCID
        if (error.message.includes('Invalid PieceCID')) {
          throw error;
        }

        // Not found
        if (error.message.includes('not found') || error.message.includes('404')) {
          throw new Error(`File not found. The PieceCID "${pieceCid}" may be invalid or the file may not be available.`);
        }

        // Network errors
        if (error.message.includes('network') || error.message.includes('timeout')) {
          throw new Error('Network error during download. Please check your connection and try again.');
        }
      }

      throw new Error('Failed to download file from Filecoin storage. Please try again.');
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.synapse = null;
    this.provider = null;
    console.log('[Synapse] Disconnected');
  }
}

// Singleton instance
let synapseManager: SynapseStorageManager | null = null;

/**
 * Get the Synapse storage manager instance
 * Creates a new instance if one doesn't exist
 */
export function getSynapseManager(): SynapseStorageManager {
  if (!synapseManager) {
    synapseManager = new SynapseStorageManager();
  }
  return synapseManager;
}

/**
 * Initialize Synapse SDK
 * Convenience function for initializing the singleton manager
 */
export async function initializeSynapse(): Promise<void> {
  const manager = getSynapseManager();
  await manager.initialize();
}

/**
 * Disconnect from Synapse SDK
 * Convenience function for disconnecting the singleton manager
 */
export async function disconnectSynapse(): Promise<void> {
  if (synapseManager) {
    await synapseManager.disconnect();
    synapseManager = null;
  }
}

// Export types
export type { StorageBalances, UploadResult };
