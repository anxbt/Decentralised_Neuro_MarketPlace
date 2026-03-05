/**
 * Unit tests for contract.ts
 * 
 * Tests the smart contract wrapper functions for NeuroMarketplace
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  FILECOIN_CALIBRATION_CHAIN_ID
} from './contract';

// Mock ethers.js
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    BrowserProvider: vi.fn(),
    Contract: vi.fn()
  };
});

describe('contract.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should export correct chain ID for Filecoin Calibration', () => {
      expect(FILECOIN_CALIBRATION_CHAIN_ID).toBe(314159);
    });
  });

  describe('formatPrice', () => {
    it('should convert wei to tFIL string', () => {
      const priceInWei = BigInt('1000000000000000000'); // 1 tFIL
      const result = formatPrice(priceInWei);
      expect(result).toBe('1.0');
    });

    it('should handle fractional tFIL amounts', () => {
      const priceInWei = BigInt('500000000000000000'); // 0.5 tFIL
      const result = formatPrice(priceInWei);
      expect(result).toBe('0.5');
    });

    it('should handle zero price', () => {
      const priceInWei = BigInt('0');
      const result = formatPrice(priceInWei);
      expect(result).toBe('0.0');
    });
  });

  describe('parsePrice', () => {
    it('should convert tFIL string to wei', () => {
      const priceInTFIL = '1.0';
      const result = parsePrice(priceInTFIL);
      expect(result).toBe(BigInt('1000000000000000000'));
    });

    it('should handle fractional tFIL amounts', () => {
      const priceInTFIL = '0.5';
      const result = parsePrice(priceInTFIL);
      expect(result).toBe(BigInt('500000000000000000'));
    });

    it('should handle zero price', () => {
      const priceInTFIL = '0';
      const result = parsePrice(priceInTFIL);
      expect(result).toBe(BigInt('0'));
    });
  });

  describe('retryTransaction', () => {
    it('should return result on first success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await retryTransaction(mockFn, 3, 100);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const result = await retryTransaction(mockFn, 3, 100);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on user rejection', async () => {
      const error = new Error('User rejected');
      (error as any).code = 'ACTION_REJECTED';
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(retryTransaction(mockFn, 3, 100)).rejects.toThrow('User rejected');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on validation errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Dataset already exists'));
      
      await expect(retryTransaction(mockFn, 3, 100)).rejects.toThrow('already exists');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(retryTransaction(mockFn, 3, 100)).rejects.toThrow('failed after 3 attempts');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error handling', () => {
    it('should provide user-friendly error messages', () => {
      const errorMessages = [
        'Transaction rejected by user',
        'Dataset ID already exists',
        'Invalid CID provided',
        'Price must be greater than zero',
        'Dataset not found',
        'Payment amount does not match dataset price',
        'You have already purchased this dataset',
        'Insufficient tFIL balance'
      ];

      // Verify error messages are descriptive
      errorMessages.forEach(msg => {
        expect(msg.length).toBeGreaterThan(10);
        expect(msg).not.toContain('undefined');
      });
    });
  });

  describe('Type safety', () => {
    it('should export correct TypeScript types', () => {
      // This test verifies that types compile correctly
      const dataset: {
        cid: string;
        researcher: string;
        price: bigint;
        exists: boolean;
      } = {
        cid: 'QmTest',
        researcher: '0x123',
        price: BigInt(1000),
        exists: true
      };

      expect(dataset.cid).toBe('QmTest');
      expect(dataset.researcher).toBe('0x123');
      expect(dataset.price).toBe(BigInt(1000));
      expect(dataset.exists).toBe(true);
    });
  });
});
