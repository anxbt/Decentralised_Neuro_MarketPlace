/**
 * Unit tests for Lit Protocol integration
 * Tests initialization, configuration, and access control condition creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeLitClient,
  getLitClient,
  disconnectLit,
  type EvmContractCondition,
} from './lit';

// Mock the Lit Protocol encryption module
vi.mock('@lit-protocol/encryption', () => ({
  encryptString: vi.fn(),
  decryptToString: vi.fn(),
}));

describe('Lit Protocol Client', () => {
  const mockContractAddress = '0x1234567890123456789012345678901234567890';
  const mockChain = 'filecoin';

  beforeEach(async () => {
    // Clean up any existing client
    await disconnectLit();
  });

  describe('Initialization', () => {
    it('should initialize with contract address', () => {
      expect(() => {
        initializeLitClient(mockContractAddress, mockChain);
      }).not.toThrow();
    });

    it('should throw error when initializing without contract address', () => {
      expect(() => {
        initializeLitClient('', mockChain);
      }).toThrow('Contract address is required');
    });

    it('should return initialized client', () => {
      initializeLitClient(mockContractAddress, mockChain);
      const client = getLitClient();
      expect(client).toBeDefined();
    });
  });

  describe('Access Control Conditions', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should create access control conditions with correct structure', () => {
      const client = getLitClient();
      const datasetId = 'test-dataset-123';
      
      // Access the private method through type assertion for testing
      const conditions = (client as any).createAccessControlConditions(datasetId);
      
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toMatchObject({
        contractAddress: mockContractAddress,
        functionName: 'hasAccess',
        chain: mockChain,
      });
    });

    it('should include dataset ID in function parameters', () => {
      const client = getLitClient();
      const datasetId = 'test-dataset-456';
      
      const conditions = (client as any).createAccessControlConditions(datasetId);
      
      expect(conditions[0].functionParams).toEqual([
        datasetId,
        ':userAddress',
      ]);
    });

    it('should configure correct return value test', () => {
      const client = getLitClient();
      const datasetId = 'test-dataset-789';
      
      const conditions = (client as any).createAccessControlConditions(datasetId);
      
      expect(conditions[0].returnValueTest).toEqual({
        key: '',
        comparator: '=',
        value: 'true',
      });
    });

    it('should include correct function ABI', () => {
      const client = getLitClient();
      const datasetId = 'test-dataset-abc';
      
      const conditions = (client as any).createAccessControlConditions(datasetId);
      const abi = conditions[0].functionAbi;
      
      expect(abi.name).toBe('hasAccess');
      expect(abi.type).toBe('function');
      expect(abi.stateMutability).toBe('view');
      expect(abi.inputs).toHaveLength(2);
      expect(abi.outputs).toHaveLength(1);
      expect(abi.outputs[0].type).toBe('bool');
    });

    it('should have correct input types in ABI', () => {
      const client = getLitClient();
      const datasetId = 'test-dataset-def';
      
      const conditions = (client as any).createAccessControlConditions(datasetId);
      const inputs = conditions[0].functionAbi.inputs;
      
      expect(inputs[0]).toMatchObject({
        type: 'string',
        name: 'datasetId',
        internalType: 'string',
      });
      
      expect(inputs[1]).toMatchObject({
        type: 'address',
        name: 'buyer',
        internalType: 'address',
      });
    });
  });

  describe('Configuration', () => {
    it('should use default chain when not specified', () => {
      initializeLitClient(mockContractAddress);
      const client = getLitClient();
      
      const conditions = (client as any).createAccessControlConditions('test');
      expect(conditions[0].chain).toBe('filecoin');
    });

    it('should use custom chain when specified', () => {
      const customChain = 'ethereum';
      initializeLitClient(mockContractAddress, customChain);
      const client = getLitClient();
      
      const conditions = (client as any).createAccessControlConditions('test');
      expect(conditions[0].chain).toBe(customChain);
    });
  });

  describe('Multiple Dataset IDs', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should create unique conditions for different dataset IDs', () => {
      const client = getLitClient();
      const datasetId1 = 'dataset-001';
      const datasetId2 = 'dataset-002';
      
      const conditions1 = (client as any).createAccessControlConditions(datasetId1);
      const conditions2 = (client as any).createAccessControlConditions(datasetId2);
      
      expect(conditions1[0].functionParams[0]).toBe(datasetId1);
      expect(conditions2[0].functionParams[0]).toBe(datasetId2);
      expect(conditions1[0].functionParams[0]).not.toBe(conditions2[0].functionParams[0]);
    });

    it('should handle special characters in dataset IDs', () => {
      const client = getLitClient();
      const specialDatasetId = 'dataset-with-special-chars_123!@#';
      
      const conditions = (client as any).createAccessControlConditions(specialDatasetId);
      
      expect(conditions[0].functionParams[0]).toBe(specialDatasetId);
    });

    it('should handle empty dataset ID', () => {
      const client = getLitClient();
      const emptyDatasetId = '';
      
      const conditions = (client as any).createAccessControlConditions(emptyDatasetId);
      
      expect(conditions[0].functionParams[0]).toBe(emptyDatasetId);
    });
  });

  describe('File Encryption Input Validation', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should throw error when file is null', async () => {
      const client = getLitClient();
      
      await expect(
        (client as any).encryptFile(null, 'test-dataset')
      ).rejects.toThrow('No file provided for encryption');
    });

    it('should throw error when file is undefined', async () => {
      const client = getLitClient();
      
      await expect(
        (client as any).encryptFile(undefined, 'test-dataset')
      ).rejects.toThrow('No file provided for encryption');
    });

    it('should throw error when dataset ID is empty', async () => {
      const client = getLitClient();
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await expect(
        (client as any).encryptFile(mockFile, '')
      ).rejects.toThrow('Dataset ID is required for encryption');
    });

    it('should throw error when dataset ID is whitespace only', async () => {
      const client = getLitClient();
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await expect(
        (client as any).encryptFile(mockFile, '   ')
      ).rejects.toThrow('Dataset ID is required for encryption');
    });
  });

  describe('Error Message User-Friendliness', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should provide user-friendly error for connection issues', async () => {
      const client = getLitClient();
      
      // Create a proper mock file with arrayBuffer method
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
        name: 'test.txt',
        type: 'text/plain',
        size: 4,
      } as unknown as File;
      
      // Mock encryptMessage to throw connection error
      vi.spyOn(client as any, 'encryptMessage').mockRejectedValue(
        new Error('Failed to connect to network')
      );
      
      await expect(
        (client as any).encryptFile(mockFile, 'test-dataset')
      ).rejects.toThrow('Unable to connect to encryption service');
    });

    it('should provide user-friendly error for network issues', async () => {
      const client = getLitClient();
      
      // Create a proper mock file with arrayBuffer method
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
        name: 'test.txt',
        type: 'text/plain',
        size: 4,
      } as unknown as File;
      
      // Mock encryptMessage to throw network error
      vi.spyOn(client as any, 'encryptMessage').mockRejectedValue(
        new Error('network timeout')
      );
      
      await expect(
        (client as any).encryptFile(mockFile, 'test-dataset')
      ).rejects.toThrow('Network error during encryption');
    });

    it('should provide generic user-friendly error for unknown issues', async () => {
      const client = getLitClient();
      
      // Create a proper mock file with arrayBuffer method
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
        name: 'test.txt',
        type: 'text/plain',
        size: 4,
      } as unknown as File;
      
      // Mock encryptMessage to throw unknown error
      vi.spyOn(client as any, 'encryptMessage').mockRejectedValue(
        new Error('Unknown internal error')
      );
      
      await expect(
        (client as any).encryptFile(mockFile, 'test-dataset')
      ).rejects.toThrow('Failed to encrypt file. Please try again or contact support');
    });
  });

  describe('File Decryption Input Validation', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should throw error when ciphertext is empty', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      await expect(
        (client as any).decryptFile(
          '',
          'hash123',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Invalid encrypted data provided');
    });

    it('should throw error when dataToEncryptHash is empty', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          '',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Invalid encrypted data provided');
    });

    it('should throw error when dataset ID is empty', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          '',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Dataset ID is required for decryption');
    });

    it('should throw error when wallet address is empty', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          'dataset-id',
          '',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Wallet address is required for decryption');
    });
  });

  describe('Decryption Error Handling', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should provide access denied error when user lacks access', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock decryptMessage to throw access control error
      vi.spyOn(client as any, 'decryptMessage').mockRejectedValue(
        new Error('access control condition not met')
      );
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Access denied. You must purchase this dataset before downloading.');
    });

    it('should provide access denied error for unauthorized error', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock decryptMessage to throw unauthorized error
      vi.spyOn(client as any, 'decryptMessage').mockRejectedValue(
        new Error('not authorized to decrypt')
      );
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Access denied. You must purchase this dataset before downloading.');
    });

    it('should provide network error for connection issues', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock decryptMessage to throw network error
      vi.spyOn(client as any, 'decryptMessage').mockRejectedValue(
        new Error('network timeout occurred')
      );
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Network error during decryption. Please check your connection and try again.');
    });

    it('should provide generic error for unknown decryption failures', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock decryptMessage to throw unknown error
      vi.spyOn(client as any, 'decryptMessage').mockRejectedValue(
        new Error('Unknown decryption error')
      );
      
      await expect(
        (client as any).decryptFile(
          'ciphertext123',
          'hash123',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner,
          'test.txt',
          'text/plain'
        )
      ).rejects.toThrow('Failed to decrypt file. You may not have access to this dataset or there was a technical error.');
    });
  });

  describe('Decrypt Message Error Handling', () => {
    beforeEach(() => {
      initializeLitClient(mockContractAddress, mockChain);
    });

    it('should provide access denied error for access control failures', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock getClient and getSessionSignatures
      vi.spyOn(client as any, 'getClient').mockResolvedValue({});
      vi.spyOn(client as any, 'getSessionSignatures').mockResolvedValue({});
      
      // Mock decryptToString from encryption module
      const { decryptToString } = await import('@lit-protocol/encryption');
      vi.mocked(decryptToString).mockRejectedValue(
        new Error('access control condition failed')
      );
      
      await expect(
        (client as any).decryptMessage(
          'ciphertext',
          'hash',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner
        )
      ).rejects.toThrow('Access denied. You must purchase this dataset before you can decrypt it.');
    });

    it('should provide authentication error for session signature failures', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock getClient and getSessionSignatures
      vi.spyOn(client as any, 'getClient').mockResolvedValue({});
      vi.spyOn(client as any, 'getSessionSignatures').mockResolvedValue({});
      
      // Mock decryptToString to throw session error
      const { decryptToString } = await import('@lit-protocol/encryption');
      vi.mocked(decryptToString).mockRejectedValue(
        new Error('session signature invalid')
      );
      
      await expect(
        (client as any).decryptMessage(
          'ciphertext',
          'hash',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner
        )
      ).rejects.toThrow('Authentication failed. Please reconnect your wallet and try again.');
    });

    it('should provide network error for timeout issues', async () => {
      const client = getLitClient();
      const mockSigner = {} as any;
      
      // Mock getClient and getSessionSignatures
      vi.spyOn(client as any, 'getClient').mockResolvedValue({});
      vi.spyOn(client as any, 'getSessionSignatures').mockResolvedValue({});
      
      // Mock decryptToString to throw network error
      const { decryptToString } = await import('@lit-protocol/encryption');
      vi.mocked(decryptToString).mockRejectedValue(
        new Error('network timeout')
      );
      
      await expect(
        (client as any).decryptMessage(
          'ciphertext',
          'hash',
          'dataset-id',
          '0x1234567890123456789012345678901234567890',
          mockSigner
        )
      ).rejects.toThrow('Network error during decryption. Please check your connection and try again.');
    });
  });
});
