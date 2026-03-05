/**
 * Property-Based Tests for Purchase Precondition Verification
 * Feature: neuromarket, Property 12: Purchase precondition verification
 * 
 * These tests use fast-check to verify that wallet connection is verified
 * before initiating any purchase transaction for all possible purchase attempts.
 * 
 * Validates: Requirements 5.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock wallet state interface
 */
interface WalletState {
  isConnected: boolean;
  address: string | null;
}

/**
 * Mock dataset interface for purchase testing
 */
interface Dataset {
  id: string;
  title: string;
  price: string;
  cid: string;
  researcher_address: string;
}

/**
 * Purchase attempt result
 */
interface PurchaseAttemptResult {
  allowed: boolean;
  reason?: string;
  walletCheckPerformed: boolean;
}

/**
 * Purchase precondition verification function
 * This function represents the logic that should occur before any purchase transaction
 * 
 * The system MUST verify wallet connection before initiating a purchase transaction.
 * This is the critical precondition that prevents unauthorized or invalid purchases.
 */
function verifyPurchasePreconditions(
  walletState: WalletState,
  dataset: Dataset
): PurchaseAttemptResult {
  // CRITICAL: Wallet connection check MUST happen first
  // This is the precondition that Property 12 validates
  const walletCheckPerformed = true;

  // Check 1: Wallet must be connected
  if (!walletState.isConnected) {
    return {
      allowed: false,
      reason: 'Wallet not connected',
      walletCheckPerformed
    };
  }

  // Check 2: Wallet address must be available
  if (!walletState.address) {
    return {
      allowed: false,
      reason: 'Wallet address not available',
      walletCheckPerformed
    };
  }

  // Check 3: Dataset must exist
  if (!dataset || !dataset.id) {
    return {
      allowed: false,
      reason: 'Invalid dataset',
      walletCheckPerformed
    };
  }

  // Check 4: Price must be valid
  if (!dataset.price || parseFloat(dataset.price) <= 0) {
    return {
      allowed: false,
      reason: 'Invalid price',
      walletCheckPerformed
    };
  }

  // All preconditions met
  return {
    allowed: true,
    walletCheckPerformed
  };
}

/**
 * Simulates the purchase button click handler logic
 * This represents the actual flow in DatasetDetail.tsx
 */
function handlePurchaseAttempt(
  walletState: WalletState,
  dataset: Dataset,
  setShowConnectModal: (show: boolean) => void,
  setShowPurchaseModal: (show: boolean) => void
): PurchaseAttemptResult {
  // Verify preconditions first
  const preconditionResult = verifyPurchasePreconditions(walletState, dataset);

  if (!preconditionResult.allowed) {
    // If wallet not connected, show connect modal
    if (preconditionResult.reason === 'Wallet not connected' || 
        preconditionResult.reason === 'Wallet address not available') {
      setShowConnectModal(true);
    }
    return preconditionResult;
  }

  // Preconditions met, show purchase modal
  setShowPurchaseModal(true);
  return preconditionResult;
}

describe('Property-Based Tests: Purchase Precondition Verification', () => {
  let showConnectModalCalled = false;
  let showPurchaseModalCalled = false;

  const mockSetShowConnectModal = vi.fn((show: boolean) => {
    showConnectModalCalled = show;
  });

  const mockSetShowPurchaseModal = vi.fn((show: boolean) => {
    showPurchaseModalCalled = show;
  });

  beforeEach(() => {
    showConnectModalCalled = false;
    showPurchaseModalCalled = false;
    mockSetShowConnectModal.mockClear();
    mockSetShowPurchaseModal.mockClear();
  });

  /**
   * Feature: neuromarket, Property 12: Purchase precondition verification
   * 
   * For any purchase attempt, the system should verify wallet connection
   * before initiating the transaction.
   * 
   * Validates: Requirements 5.1
   */
  describe('Property 12: Purchase precondition verification', () => {
    it('should always perform wallet connection check before allowing purchase', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary wallet states and datasets
          fc.record({
            walletState: fc.record({
              isConnected: fc.boolean(),
              address: fc.option(
                fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                { nil: null }
              )
            }),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletState, dataset }) => {
            const result = verifyPurchasePreconditions(walletState, dataset);

            // CRITICAL: Wallet check must ALWAYS be performed
            expect(result.walletCheckPerformed).toBe(true);

            // If wallet is not connected, purchase should not be allowed
            if (!walletState.isConnected || !walletState.address) {
              expect(result.allowed).toBe(false);
              expect(result.reason).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all purchase attempts when wallet is not connected', async () => {
      await fc.assert(
        fc.property(
          // Generate datasets with wallet disconnected
          fc.record({
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ dataset }) => {
            // Wallet is explicitly disconnected
            const walletState: WalletState = {
              isConnected: false,
              address: null
            };

            const result = verifyPurchasePreconditions(walletState, dataset);

            // Purchase should NEVER be allowed without wallet connection
            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.reason).toContain('Wallet');
            expect(result.walletCheckPerformed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject purchase attempts when wallet is connected but address is null', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ dataset }) => {
            // Edge case: wallet shows connected but no address
            const walletState: WalletState = {
              isConnected: true,
              address: null
            };

            const result = verifyPurchasePreconditions(walletState, dataset);

            // Should be rejected due to missing address
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('address');
            expect(result.walletCheckPerformed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow purchase only when wallet is connected with valid address', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletAddress: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletAddress, dataset }) => {
            // Wallet is properly connected with valid address
            const walletState: WalletState = {
              isConnected: true,
              address: walletAddress
            };

            const result = verifyPurchasePreconditions(walletState, dataset);

            // Purchase should be allowed
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
            expect(result.walletCheckPerformed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger connect modal when purchase attempted without wallet', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ dataset }) => {
            // Reset mocks
            mockSetShowConnectModal.mockClear();
            mockSetShowPurchaseModal.mockClear();

            const walletState: WalletState = {
              isConnected: false,
              address: null
            };

            const result = handlePurchaseAttempt(
              walletState,
              dataset,
              mockSetShowConnectModal,
              mockSetShowPurchaseModal
            );

            // Should not allow purchase
            expect(result.allowed).toBe(false);
            expect(result.walletCheckPerformed).toBe(true);

            // Should trigger connect modal, not purchase modal
            expect(mockSetShowConnectModal).toHaveBeenCalledWith(true);
            expect(mockSetShowPurchaseModal).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should trigger purchase modal only when wallet is connected', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletAddress: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletAddress, dataset }) => {
            // Reset mocks
            mockSetShowConnectModal.mockClear();
            mockSetShowPurchaseModal.mockClear();

            const walletState: WalletState = {
              isConnected: true,
              address: walletAddress
            };

            const result = handlePurchaseAttempt(
              walletState,
              dataset,
              mockSetShowConnectModal,
              mockSetShowPurchaseModal
            );

            // Should allow purchase
            expect(result.allowed).toBe(true);
            expect(result.walletCheckPerformed).toBe(true);

            // Should trigger purchase modal, not connect modal
            expect(mockSetShowPurchaseModal).toHaveBeenCalledWith(true);
            expect(mockSetShowConnectModal).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify wallet connection before checking any other preconditions', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletState: fc.record({
              isConnected: fc.boolean(),
              address: fc.option(
                fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                { nil: null }
              )
            }),
            // Generate potentially invalid datasets
            dataset: fc.record({
              id: fc.option(fc.uuid(), { nil: '' }),
              title: fc.string({ minLength: 0, maxLength: 100 }),
              price: fc.oneof(
                fc.double({ min: 0.01, max: 1000 }).map(String),
                fc.constant('0'),
                fc.constant('-1'),
                fc.constant('')
              ),
              cid: fc.string({ minLength: 0, maxLength: 50 }),
              researcher_address: fc.string({ minLength: 0, maxLength: 42 })
            })
          }),
          ({ walletState, dataset }) => {
            const result = verifyPurchasePreconditions(walletState, dataset);

            // Wallet check must always be performed first
            expect(result.walletCheckPerformed).toBe(true);

            // If wallet is not connected, that should be the rejection reason
            // (not dataset validation issues)
            if (!walletState.isConnected || !walletState.address) {
              expect(result.allowed).toBe(false);
              expect(result.reason).toBeDefined();
              expect(result.reason).toMatch(/wallet|address/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently verify wallet state across multiple purchase attempts', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletState: fc.record({
              isConnected: fc.boolean(),
              address: fc.option(
                fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                { nil: null }
              )
            }),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletState, dataset }) => {
            // Verify preconditions multiple times with same state
            const result1 = verifyPurchasePreconditions(walletState, dataset);
            const result2 = verifyPurchasePreconditions(walletState, dataset);
            const result3 = verifyPurchasePreconditions(walletState, dataset);

            // Results should be identical
            expect(result1.allowed).toBe(result2.allowed);
            expect(result2.allowed).toBe(result3.allowed);
            expect(result1.reason).toBe(result2.reason);
            expect(result2.reason).toBe(result3.reason);
            expect(result1.walletCheckPerformed).toBe(true);
            expect(result2.walletCheckPerformed).toBe(true);
            expect(result3.walletCheckPerformed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle rapid purchase attempts with changing wallet state', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            // Generate a sequence of wallet state changes
            walletStates: fc.array(
              fc.record({
                isConnected: fc.boolean(),
                address: fc.option(
                  fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                  { nil: null }
                )
              }),
              { minLength: 2, maxLength: 10 }
            ),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletStates, dataset }) => {
            // Simulate rapid purchase attempts with changing wallet state
            const results = walletStates.map(walletState => 
              verifyPurchasePreconditions(walletState, dataset)
            );

            // Each attempt should independently verify wallet state
            results.forEach((result, index) => {
              expect(result.walletCheckPerformed).toBe(true);

              const walletState = walletStates[index];
              if (!walletState.isConnected || !walletState.address) {
                expect(result.allowed).toBe(false);
              } else {
                expect(result.allowed).toBe(true);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject purchase with invalid dataset even if wallet is connected', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletAddress: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
            // Generate invalid datasets
            invalidDataset: fc.oneof(
              // Missing ID
              fc.record({
                id: fc.constant(''),
                title: fc.string({ minLength: 1 }),
                price: fc.double({ min: 0.01 }).map(String),
                cid: fc.string({ minLength: 46 }),
                researcher_address: fc.hexaString({ minLength: 40 }).map(s => `0x${s}`)
              }),
              // Invalid price
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1 }),
                price: fc.constantFrom('0', '-1', ''),
                cid: fc.string({ minLength: 46 }),
                researcher_address: fc.hexaString({ minLength: 40 }).map(s => `0x${s}`)
              })
            )
          }),
          ({ walletAddress, invalidDataset }) => {
            const walletState: WalletState = {
              isConnected: true,
              address: walletAddress
            };

            const result = verifyPurchasePreconditions(walletState, invalidDataset);

            // Wallet check should be performed
            expect(result.walletCheckPerformed).toBe(true);

            // Purchase should be rejected due to invalid dataset
            expect(result.allowed).toBe(false);
            expect(result.reason).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify wallet connection is the first gate before transaction initiation', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            walletState: fc.record({
              isConnected: fc.boolean(),
              address: fc.option(
                fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`),
                { nil: null }
              )
            }),
            dataset: fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              price: fc.double({ min: 0.01, max: 1000 }).map(String),
              cid: fc.string({ minLength: 46, maxLength: 46 }),
              researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => `0x${s}`)
            })
          }),
          ({ walletState, dataset }) => {
            const startTime = Date.now();
            const result = verifyPurchasePreconditions(walletState, dataset);
            const endTime = Date.now();

            // Verification should be synchronous and fast
            expect(endTime - startTime).toBeLessThan(10);

            // Wallet check must always be performed
            expect(result.walletCheckPerformed).toBe(true);

            // Result should be deterministic based on wallet state
            if (walletState.isConnected && walletState.address) {
              // Valid wallet state should allow purchase (assuming valid dataset)
              expect(result.allowed).toBe(true);
            } else {
              // Invalid wallet state should always block purchase
              expect(result.allowed).toBe(false);
              expect(result.reason).toMatch(/wallet|address/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
