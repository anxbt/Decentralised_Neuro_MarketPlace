/**
 * Property-Based Tests for Purchase Transaction Completeness
 * Feature: neuromarket, Property 13: Purchase transaction completeness
 * 
 * These tests use fast-check to verify that for any purchase transaction,
 * the system includes both dataset ID and exact payment amount, and the
 * smart contract verifies payment matches dataset price before processing.
 * 
 * Validates: Requirements 5.2, 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ethers, parseEther, formatEther } from 'ethers';

/**
 * Dataset information from smart contract
 */
interface Dataset {
  id: string;
  cid: string;
  researcher: string;
  price: bigint;
  exists: boolean;
}

/**
 * Purchase transaction parameters
 */
interface PurchaseTransaction {
  datasetId: string;
  paymentAmount: bigint;
}

/**
 * Purchase transaction result
 */
interface PurchaseResult {
  success: boolean;
  error?: string;
  transactionHash?: string;
  datasetIdIncluded: boolean;
  paymentAmountIncluded: boolean;
  paymentVerified: boolean;
}

/**
 * Mock smart contract interface
 */
interface MockContract {
  datasets: Map<string, Dataset>;
  accessControl: Map<string, Set<string>>;
  purchaseDataset: (datasetId: string, options: { value: bigint }) => Promise<any>;
  hasAccess: (datasetId: string, buyer: string) => Promise<boolean>;
}

/**
 * Create a mock smart contract for testing
 */
function createMockContract(): MockContract {
  const datasets = new Map<string, Dataset>();
  const accessControl = new Map<string, Set<string>>();

  return {
    datasets,
    accessControl,
    
    async purchaseDataset(datasetId: string, options: { value: bigint }) {
      // CHECKS: Verify all preconditions (Requirement 8.3)
      const dataset = datasets.get(datasetId);
      
      if (!dataset || !dataset.exists) {
        throw new Error('Dataset does not exist');
      }
      
      // CRITICAL: Verify payment amount matches dataset price (Requirement 5.2, 8.3)
      if (options.value !== dataset.price) {
        throw new Error('Incorrect payment amount');
      }
      
      // Check if already purchased
      const buyers = accessControl.get(datasetId) || new Set();
      if (buyers.has('buyer')) {
        throw new Error('Already purchased');
      }
      
      // EFFECTS: Grant access
      if (!accessControl.has(datasetId)) {
        accessControl.set(datasetId, new Set());
      }
      accessControl.get(datasetId)!.add('buyer');
      
      // INTERACTIONS: Transfer funds (simulated)
      return {
        hash: `0x${Math.random().toString(16).slice(2)}`,
        wait: async () => ({ status: 1 })
      };
    },
    
    async hasAccess(datasetId: string, buyer: string): Promise<boolean> {
      const buyers = accessControl.get(datasetId);
      return buyers ? buyers.has(buyer) : false;
    }
  };
}

/**
 * Simulate the purchase transaction flow
 * This represents the complete flow from frontend to smart contract
 */
async function executePurchaseTransaction(
  transaction: PurchaseTransaction,
  contract: MockContract
): Promise<PurchaseResult> {
  // Validate that transaction includes required parameters
  const datasetIdIncluded = transaction.datasetId !== undefined && transaction.datasetId !== null && transaction.datasetId.length > 0;
  const paymentAmountIncluded = transaction.paymentAmount !== undefined && transaction.paymentAmount !== null;

  // If required parameters are missing, fail immediately
  if (!datasetIdIncluded || !paymentAmountIncluded) {
    return {
      success: false,
      error: 'Missing required transaction parameters',
      datasetIdIncluded,
      paymentAmountIncluded,
      paymentVerified: false
    };
  }

  try {
    // Get dataset to verify payment
    const dataset = contract.datasets.get(transaction.datasetId);
    
    if (!dataset) {
      return {
        success: false,
        error: 'Dataset does not exist',
        datasetIdIncluded,
        paymentAmountIncluded,
        paymentVerified: false
      };
    }

    // Verify payment matches dataset price (this is what the contract does)
    const paymentVerified = transaction.paymentAmount === dataset.price;

    // Call smart contract purchase function
    const tx = await contract.purchaseDataset(transaction.datasetId, {
      value: transaction.paymentAmount
    });

    await tx.wait();

    return {
      success: true,
      transactionHash: tx.hash,
      datasetIdIncluded,
      paymentAmountIncluded,
      paymentVerified
    };
  } catch (error: any) {
    // Determine if payment was verified before error
    const dataset = contract.datasets.get(transaction.datasetId);
    const paymentVerified = dataset ? transaction.paymentAmount === dataset.price : false;

    return {
      success: false,
      error: error.message,
      datasetIdIncluded,
      paymentAmountIncluded,
      paymentVerified
    };
  }
}

describe('Property-Based Tests: Purchase Transaction Completeness', () => {
  let mockContract: MockContract;

  beforeEach(() => {
    mockContract = createMockContract();
  });

  /**
   * Feature: neuromarket, Property 13: Purchase transaction completeness
   * 
   * For any purchase transaction, the system should include both dataset ID
   * and exact payment amount, and the smart contract should verify payment
   * matches dataset price before processing.
   * 
   * Validates: Requirements 5.2, 8.3
   */
  describe('Property 13: Purchase transaction completeness', () => {
    it('should always include dataset ID and payment amount in purchase transactions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            price: fc.bigInt({ min: 1n, max: 1000000000000000000n }), // 0.001 to 1 tFIL in wei
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }),
          async ({ datasetId, price, cid, researcher }) => {
            // Register dataset in mock contract
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Create purchase transaction with correct payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: price
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // CRITICAL: Transaction must always include dataset ID
            expect(result.datasetIdIncluded).toBe(true);

            // CRITICAL: Transaction must always include payment amount
            expect(result.paymentAmountIncluded).toBe(true);

            // With correct parameters, transaction should succeed
            expect(result.success).toBe(true);
            expect(result.paymentVerified).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transactions with incorrect payment amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            correctPrice: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            incorrectPrice: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }).filter(({ correctPrice, incorrectPrice }) => correctPrice !== incorrectPrice),
          async ({ datasetId, correctPrice, incorrectPrice, cid, researcher }) => {
            // Register dataset with correct price
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price: correctPrice,
              exists: true
            });

            // Attempt purchase with incorrect payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: incorrectPrice
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction parameters should be included
            expect(result.datasetIdIncluded).toBe(true);
            expect(result.paymentAmountIncluded).toBe(true);

            // Payment verification should fail
            expect(result.paymentVerified).toBe(false);

            // Transaction should be rejected
            expect(result.success).toBe(false);
            expect(result.error).toContain('Incorrect payment amount');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify payment matches dataset price before processing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            price: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            // Generate a payment offset (positive or negative)
            paymentOffset: fc.bigInt({ min: -1000000000000000n, max: 1000000000000000n })
          }).filter(({ price, paymentOffset }) => price + paymentOffset > 0n),
          async ({ datasetId, price, cid, researcher, paymentOffset }) => {
            // Register dataset
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Create transaction with offset payment
            const paymentAmount = price + paymentOffset;
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction parameters should always be included
            expect(result.datasetIdIncluded).toBe(true);
            expect(result.paymentAmountIncluded).toBe(true);

            // Payment verification result should match whether payment is exact
            const isExactPayment = paymentOffset === 0n;
            expect(result.paymentVerified).toBe(isExactPayment);

            // Transaction should succeed only with exact payment
            if (isExactPayment) {
              expect(result.success).toBe(true);
            } else {
              expect(result.success).toBe(false);
              expect(result.error).toContain('Incorrect payment amount');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject transactions with missing dataset ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            paymentAmount: fc.bigInt({ min: 1n, max: 1000000000000000000n })
          }),
          async ({ paymentAmount }) => {
            // Create transaction with empty dataset ID
            const transaction: PurchaseTransaction = {
              datasetId: '',
              paymentAmount
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Dataset ID should be marked as not included (empty string)
            expect(result.datasetIdIncluded).toBe(false);

            // Payment amount should be included
            expect(result.paymentAmountIncluded).toBe(true);

            // Transaction should fail
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all price ranges with exact payment verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            // Test various price ranges
            price: fc.oneof(
              fc.bigInt({ min: 1n, max: 1000n }), // Very small prices
              fc.bigInt({ min: 1000n, max: 1000000n }), // Small prices
              fc.bigInt({ min: 1000000n, max: 1000000000000000n }), // Medium prices
              fc.bigInt({ min: 1000000000000000n, max: 1000000000000000000n }) // Large prices (up to 1 tFIL)
            ),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }),
          async ({ datasetId, price, cid, researcher }) => {
            // Register dataset
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Create transaction with exact payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: price
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // All transaction parameters should be included
            expect(result.datasetIdIncluded).toBe(true);
            expect(result.paymentAmountIncluded).toBe(true);

            // Payment should be verified as exact match
            expect(result.paymentVerified).toBe(true);

            // Transaction should succeed
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify payment before granting access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            correctPrice: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            incorrectPrice: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }).filter(({ correctPrice, incorrectPrice }) => correctPrice !== incorrectPrice),
          async ({ datasetId, correctPrice, incorrectPrice, cid, researcher }) => {
            // Register dataset
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price: correctPrice,
              exists: true
            });

            // Attempt purchase with incorrect payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: incorrectPrice
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction should fail due to payment mismatch
            expect(result.success).toBe(false);
            expect(result.paymentVerified).toBe(false);

            // Access should NOT be granted
            const hasAccess = await mockContract.hasAccess(datasetId, 'buyer');
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant access only after successful payment verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            price: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }),
          async ({ datasetId, price, cid, researcher }) => {
            // Register dataset
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Verify no access before purchase
            const hasAccessBefore = await mockContract.hasAccess(datasetId, 'buyer');
            expect(hasAccessBefore).toBe(false);

            // Purchase with correct payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: price
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction should succeed
            expect(result.success).toBe(true);
            expect(result.paymentVerified).toBe(true);

            // Access should be granted after successful purchase
            const hasAccessAfter = await mockContract.hasAccess(datasetId, 'buyer');
            expect(hasAccessAfter).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include transaction parameters even for non-existent datasets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            paymentAmount: fc.bigInt({ min: 1n, max: 1000000000000000000n })
          }),
          async ({ datasetId, paymentAmount }) => {
            // Do NOT register dataset - it doesn't exist

            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction parameters should still be included
            expect(result.datasetIdIncluded).toBe(true);
            expect(result.paymentAmountIncluded).toBe(true);

            // Transaction should fail (dataset doesn't exist)
            expect(result.success).toBe(false);
            expect(result.error).toContain('Dataset does not exist');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of zero payment amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            price: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
          }),
          async ({ datasetId, price, cid, researcher }) => {
            // Register dataset with non-zero price
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Attempt purchase with zero payment
            const transaction: PurchaseTransaction = {
              datasetId,
              paymentAmount: 0n
            };

            const result = await executePurchaseTransaction(transaction, mockContract);

            // Transaction parameters should be included
            expect(result.datasetIdIncluded).toBe(true);
            expect(result.paymentAmountIncluded).toBe(true);

            // Payment verification should fail (0 !== price)
            expect(result.paymentVerified).toBe(false);

            // Transaction should be rejected
            expect(result.success).toBe(false);
            expect(result.error).toContain('Incorrect payment amount');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently verify payment across multiple purchase attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            datasetId: fc.uuid(),
            price: fc.bigInt({ min: 1n, max: 1000000000000000000n }),
            cid: fc.string({ minLength: 46, maxLength: 46 }),
            researcher: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            // Generate multiple payment amounts to test
            paymentAmounts: fc.array(
              fc.bigInt({ min: 1n, max: 1000000000000000000n }),
              { minLength: 3, maxLength: 10 }
            )
          }),
          async ({ datasetId, price, cid, researcher, paymentAmounts }) => {
            // Register dataset
            mockContract.datasets.set(datasetId, {
              id: datasetId,
              cid,
              researcher,
              price,
              exists: true
            });

            // Test multiple payment amounts
            for (const paymentAmount of paymentAmounts) {
              // Reset access control for each attempt
              mockContract.accessControl.delete(datasetId);

              const transaction: PurchaseTransaction = {
                datasetId,
                paymentAmount
              };

              const result = await executePurchaseTransaction(transaction, mockContract);

              // Transaction parameters should always be included
              expect(result.datasetIdIncluded).toBe(true);
              expect(result.paymentAmountIncluded).toBe(true);

              // Payment verification should be consistent
              const isExactPayment = paymentAmount === price;
              expect(result.paymentVerified).toBe(isExactPayment);

              // Success should match payment verification
              expect(result.success).toBe(isExactPayment);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
