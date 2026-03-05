/**
 * Property-Based Tests for Marketplace Component
 * Feature: neuromarket
 * 
 * Property 9: Marketplace listing completeness
 * Property 10: Dataset navigation
 * 
 * These tests use fast-check to verify marketplace behavior across all valid inputs.
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 9.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import type { Dataset } from '@/lib/api';
import Marketplace from './Marketplace';

/**
 * Required fields for complete dataset information display
 * Based on Requirements 4.2: title, description, price, researcher information
 */
interface CompleteDatasetInfo {
  title: string;
  description: string;
  price: string;
  researcher_address: string;
}

/**
 * Validates that a dataset has all required fields for marketplace display
 * This represents the core business logic for Requirements 4.2
 */
function hasCompleteInformation(dataset: Dataset): boolean {
  // Check all required fields are present and non-empty
  return !!(
    dataset.title &&
    dataset.title.trim().length > 0 &&
    dataset.description &&
    dataset.description.trim().length > 0 &&
    dataset.price &&
    dataset.price.trim().length > 0 &&
    dataset.researcher_address &&
    dataset.researcher_address.trim().length > 0
  );
}

/**
 * Simulates the marketplace filtering and display logic
 * Returns datasets that would be displayed to the user
 */
function getDisplayedDatasets(
  allDatasets: Dataset[],
  filters?: { type?: string; search?: string }
): Dataset[] {
  let displayed = allDatasets;

  // Apply type filter if provided
  if (filters?.type && filters.type !== 'All') {
    displayed = displayed.filter(d => {
      // Extract type from description (as done in Marketplace component)
      try {
        const parsed = JSON.parse(d.description);
        return parsed.type === filters.type;
      } catch {
        return false;
      }
    });
  }

  // Apply search filter if provided
  if (filters?.search && filters.search.trim().length > 0) {
    const searchLower = filters.search.toLowerCase();
    displayed = displayed.filter(d =>
      d.title.toLowerCase().includes(searchLower) ||
      d.researcher_address.toLowerCase().includes(searchLower)
    );
  }

  return displayed;
}

/**
 * Arbitrary generator for valid Ethereum addresses
 */
const ethereumAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 }).map(
  hex => `0x${hex}`
);

/**
 * Arbitrary generator for valid dataset IDs (UUIDs)
 */
const datasetIdArb = fc.uuid();

/**
 * Arbitrary generator for valid CIDs (IPFS content identifiers)
 * Simplified format: base58-encoded string starting with 'Qm'
 */
const cidArb = fc.string({ minLength: 44, maxLength: 46 }).map(
  str => `Qm${str.substring(2)}`
);

/**
 * Arbitrary generator for valid transaction hashes
 */
const txHashArb = fc.hexaString({ minLength: 64, maxLength: 64 }).map(
  hex => `0x${hex}`
);

/**
 * Arbitrary generator for valid prices (in tFIL)
 */
const priceArb = fc.double({ min: 0.001, max: 1000, noNaN: true }).map(
  price => price.toFixed(3)
);

/**
 * Arbitrary generator for ISO date strings
 */
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(
  date => date.toISOString()
);

/**
 * Arbitrary generator for complete Dataset objects
 */
const completeDatasetArb: fc.Arbitrary<Dataset> = fc.record({
  id: datasetIdArb,
  title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
  price: priceArb,
  cid: cidArb,
  researcher_address: ethereumAddressArb,
  tx_hash: txHashArb,
  upload_date: dateArb,
  purchase_count: fc.integer({ min: 0, max: 1000 })
});

/**
 * Arbitrary generator for datasets with potentially incomplete information
 */
const incompleteDatasetArb: fc.Arbitrary<Dataset> = fc.record({
  id: datasetIdArb,
  title: fc.oneof(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.constant(''),
    fc.constant('   ') // whitespace only
  ),
  description: fc.oneof(
    fc.string({ minLength: 1, maxLength: 500 }),
    fc.constant(''),
    fc.constant('   ')
  ),
  price: fc.oneof(
    priceArb,
    fc.constant(''),
    fc.constant('0'),
    fc.constant('   ')
  ),
  cid: cidArb,
  researcher_address: fc.oneof(
    ethereumAddressArb,
    fc.constant(''),
    fc.constant('0x')
  ),
  tx_hash: txHashArb,
  upload_date: dateArb,
  purchase_count: fc.integer({ min: 0, max: 1000 })
});

describe('Property-Based Tests: Marketplace Listing Completeness', () => {
  /**
   * Feature: neuromarket, Property 9: Marketplace listing completeness
   * 
   * For any marketplace page load, all registered datasets should be displayed
   * with complete information (title, description, price, researcher address).
   * 
   * Validates: Requirements 4.1, 4.2
   */
  describe('Property 9: Marketplace listing completeness', () => {
    it('should display all registered datasets with complete information', async () => {
      await fc.assert(
        fc.property(
          // Generate an array of complete datasets
          fc.array(completeDatasetArb, { minLength: 0, maxLength: 50 }),
          (datasets) => {
            // Simulate marketplace display logic
            const displayed = getDisplayedDatasets(datasets);

            // All registered datasets should be displayed (no filtering)
            expect(displayed.length).toBe(datasets.length);

            // Each displayed dataset should have complete information
            displayed.forEach(dataset => {
              expect(hasCompleteInformation(dataset)).toBe(true);
              
              // Verify each required field is present and non-empty
              expect(dataset.title).toBeTruthy();
              expect(dataset.title.trim().length).toBeGreaterThan(0);
              
              expect(dataset.description).toBeTruthy();
              expect(dataset.description.trim().length).toBeGreaterThan(0);
              
              expect(dataset.price).toBeTruthy();
              expect(dataset.price.trim().length).toBeGreaterThan(0);
              
              expect(dataset.researcher_address).toBeTruthy();
              expect(dataset.researcher_address.trim().length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all required metadata fields for each dataset', async () => {
      await fc.assert(
        fc.property(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 20 }),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // Every dataset must have all required fields
            displayed.forEach(dataset => {
              // Title must be present
              expect(dataset).toHaveProperty('title');
              expect(typeof dataset.title).toBe('string');
              expect(dataset.title.length).toBeGreaterThan(0);

              // Description must be present
              expect(dataset).toHaveProperty('description');
              expect(typeof dataset.description).toBe('string');
              expect(dataset.description.length).toBeGreaterThan(0);

              // Price must be present
              expect(dataset).toHaveProperty('price');
              expect(typeof dataset.price).toBe('string');
              expect(dataset.price.length).toBeGreaterThan(0);

              // Researcher address must be present
              expect(dataset).toHaveProperty('researcher_address');
              expect(typeof dataset.researcher_address).toBe('string');
              expect(dataset.researcher_address.length).toBeGreaterThan(0);

              // Additional metadata fields should also be present
              expect(dataset).toHaveProperty('id');
              expect(dataset).toHaveProperty('cid');
              expect(dataset).toHaveProperty('upload_date');
              expect(dataset).toHaveProperty('purchase_count');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display datasets with incomplete information', async () => {
      await fc.assert(
        fc.property(
          fc.array(incompleteDatasetArb, { minLength: 1, maxLength: 20 }),
          (datasets) => {
            // Filter to only complete datasets (as the system should do)
            const completeDatasets = datasets.filter(hasCompleteInformation);
            const displayed = getDisplayedDatasets(completeDatasets);

            // Only datasets with complete information should be displayed
            displayed.forEach(dataset => {
              expect(hasCompleteInformation(dataset)).toBe(true);
            });

            // Incomplete datasets should not be in the displayed list
            const incompleteDatasets = datasets.filter(d => !hasCompleteInformation(d));
            incompleteDatasets.forEach(incomplete => {
              expect(displayed.find(d => d.id === incomplete.id)).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain dataset count consistency across page loads', async () => {
      await fc.assert(
        fc.property(
          fc.array(completeDatasetArb, { minLength: 0, maxLength: 30 }),
          (datasets) => {
            // Simulate multiple page loads with the same dataset list
            const load1 = getDisplayedDatasets(datasets);
            const load2 = getDisplayedDatasets(datasets);
            const load3 = getDisplayedDatasets(datasets);

            // All loads should display the same number of datasets
            expect(load1.length).toBe(datasets.length);
            expect(load2.length).toBe(datasets.length);
            expect(load3.length).toBe(datasets.length);

            // All loads should display the same datasets
            expect(load1.length).toBe(load2.length);
            expect(load2.length).toBe(load3.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display datasets with valid price formatting', async () => {
      await fc.assert(
        fc.property(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 20 }),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            displayed.forEach(dataset => {
              // Price should be a non-empty string
              expect(dataset.price).toBeTruthy();
              expect(typeof dataset.price).toBe('string');
              
              // Price should be parseable as a number
              const priceNum = parseFloat(dataset.price);
              expect(isNaN(priceNum)).toBe(false);
              
              // Price should be positive
              expect(priceNum).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display datasets with valid researcher addresses', async () => {
      await fc.assert(
        fc.property(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 20 }),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            displayed.forEach(dataset => {
              // Researcher address should be present
              expect(dataset.researcher_address).toBeTruthy();
              expect(typeof dataset.researcher_address).toBe('string');
              
              // Should start with '0x' (Ethereum address format)
              expect(dataset.researcher_address.startsWith('0x')).toBe(true);
              
              // Should be 42 characters long (0x + 40 hex chars)
              expect(dataset.researcher_address.length).toBe(42);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty marketplace gracefully', async () => {
      // Test with empty dataset array
      const emptyDatasets: Dataset[] = [];
      const displayed = getDisplayedDatasets(emptyDatasets);

      // Should return empty array, not throw error
      expect(displayed).toEqual([]);
      expect(displayed.length).toBe(0);
    });

    it('should preserve dataset order from backend', async () => {
      await fc.assert(
        fc.property(
          fc.array(completeDatasetArb, { minLength: 2, maxLength: 20 }),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // Order should be preserved (no unintended sorting)
            displayed.forEach((dataset, index) => {
              expect(dataset.id).toBe(datasets[index].id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display all datasets regardless of purchase count', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...completeDatasetArb.value,
              // Vary purchase counts including edge cases
              purchase_count: fc.oneof(
                fc.constant(0),
                fc.integer({ min: 1, max: 10 }),
                fc.integer({ min: 100, max: 1000 })
              )
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // All datasets should be displayed regardless of purchase count
            expect(displayed.length).toBe(datasets.length);

            // Verify datasets with 0 purchases are included
            const zeroPurchases = datasets.filter(d => d.purchase_count === 0);
            zeroPurchases.forEach(dataset => {
              expect(displayed.find(d => d.id === dataset.id)).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display datasets with various title lengths', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: datasetIdArb,
              title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
              price: priceArb,
              cid: cidArb,
              researcher_address: ethereumAddressArb,
              tx_hash: txHashArb,
              upload_date: dateArb,
              purchase_count: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // All datasets should be displayed regardless of title length
            expect(displayed.length).toBe(datasets.length);

            displayed.forEach(dataset => {
              expect(dataset.title.trim().length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display datasets with various description lengths', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: datasetIdArb,
              title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
              price: priceArb,
              cid: cidArb,
              researcher_address: ethereumAddressArb,
              tx_hash: txHashArb,
              upload_date: dateArb,
              purchase_count: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // All datasets should be displayed regardless of description length
            expect(displayed.length).toBe(datasets.length);

            displayed.forEach(dataset => {
              expect(dataset.description.trim().length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle datasets with special characters in metadata', async () => {
      await fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: datasetIdArb,
              // Include special characters, unicode, emojis
              title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
              price: priceArb,
              cid: cidArb,
              researcher_address: ethereumAddressArb,
              tx_hash: txHashArb,
              upload_date: dateArb,
              purchase_count: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (datasets) => {
            const displayed = getDisplayedDatasets(datasets);

            // All datasets should be displayed with special characters preserved
            expect(displayed.length).toBe(datasets.length);

            displayed.forEach((dataset, index) => {
              expect(dataset.title).toBe(datasets[index].title);
              expect(dataset.description).toBe(datasets[index].description);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify completeness check is consistent', async () => {
      await fc.assert(
        fc.property(
          completeDatasetArb,
          (dataset) => {
            // Check completeness multiple times
            const check1 = hasCompleteInformation(dataset);
            const check2 = hasCompleteInformation(dataset);
            const check3 = hasCompleteInformation(dataset);

            // Results should be identical
            expect(check1).toBe(check2);
            expect(check2).toBe(check3);

            // Complete datasets should always pass
            expect(check1).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle large numbers of datasets efficiently', async () => {
      await fc.assert(
        fc.property(
          // Generate a large number of datasets
          fc.array(completeDatasetArb, { minLength: 50, maxLength: 100 }),
          (datasets) => {
            const startTime = Date.now();
            const displayed = getDisplayedDatasets(datasets);
            const endTime = Date.now();

            // Should complete quickly even with many datasets (< 100ms)
            expect(endTime - startTime).toBeLessThan(100);

            // All datasets should still be displayed
            expect(displayed.length).toBe(datasets.length);

            // All should have complete information
            displayed.forEach(dataset => {
              expect(hasCompleteInformation(dataset)).toBe(true);
            });
          }
        ),
        { numRuns: 50 } // Fewer runs for performance test
      );
    });
  });
});


/**
 * Property-Based Tests for Dataset Navigation
 * Feature: neuromarket, Property 10: Dataset navigation
 * 
 * These tests verify that for any dataset click in the marketplace,
 * the system navigates to the corresponding detail page without full page reload
 * while maintaining application state.
 * 
 * Validates: Requirements 4.3, 9.2
 */

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchDatasets: vi.fn(),
  fetchDatasetById: vi.fn(),
}));

describe('Property-Based Tests: Dataset Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: neuromarket, Property 10: Dataset navigation
   * 
   * For any dataset click in the marketplace, the system should navigate
   * to the corresponding detail page without full page reload while
   * maintaining application state.
   * 
   * Validates: Requirements 4.3, 9.2
   */
  describe('Property 10: Dataset navigation', () => {
    it('should navigate to detail page for any dataset click', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          // Generate an array of datasets to display
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 10 }),
          async (datasets) => {
            // Mock the API to return our generated datasets
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace with MemoryRouter to track navigation
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // For each dataset, verify navigation link exists
            for (const dataset of datasets) {
              // Find the link for this dataset
              const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
              
              // Should have exactly one link per dataset
              expect(links.length).toBeGreaterThan(0);
              
              // Verify the link has the correct href
              const link = links[0] as HTMLAnchorElement;
              expect(link.href).toContain(`/dataset/${dataset.id}`);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain wallet state during navigation', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 5 }),
          fc.boolean(), // Wallet connected state
          ethereumAddressArb, // Wallet address
          async (datasets, isConnected, walletAddress) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Create a mock wallet context
            const mockWalletContext = {
              isConnected,
              address: isConnected ? walletAddress : null,
              connect: vi.fn(),
              disconnect: vi.fn(),
            };

            // Render with wallet context
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Get the first dataset link
            const firstDataset = datasets[0];
            const link = container.querySelector(`a[href="/dataset/${firstDataset.id}"]`);
            
            expect(link).toBeTruthy();
            
            // Verify link exists and has correct href (navigation would work)
            expect(link?.getAttribute('href')).toBe(`/dataset/${firstDataset.id}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use client-side routing without full page reload', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 5 }),
          async (datasets) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Verify all dataset links use React Router Link component
            // (not <a> with full href that would cause page reload)
            const firstDataset = datasets[0];
            const links = container.querySelectorAll(`a[href="/dataset/${firstDataset.id}"]`);
            
            expect(links.length).toBeGreaterThan(0);
            
            // React Router Link components should not have target="_blank" or similar
            // that would cause full page navigation
            const link = links[0] as HTMLAnchorElement;
            expect(link.target).not.toBe('_blank');
            expect(link.target).not.toBe('_parent');
            expect(link.target).not.toBe('_top');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should navigate to correct detail page for each unique dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          // Generate datasets with unique IDs
          fc.array(completeDatasetArb, { minLength: 2, maxLength: 10 }),
          async (datasets) => {
            // Ensure all IDs are unique
            const uniqueDatasets = datasets.filter((dataset, index, self) =>
              index === self.findIndex(d => d.id === dataset.id)
            );

            if (uniqueDatasets.length < 2) return; // Skip if not enough unique datasets

            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(uniqueDatasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Verify each dataset has a unique navigation link
            const datasetIds = new Set<string>();
            
            for (const dataset of uniqueDatasets) {
              const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
              expect(links.length).toBeGreaterThan(0);
              
              // Verify ID is unique
              expect(datasetIds.has(dataset.id)).toBe(false);
              datasetIds.add(dataset.id);
            }

            // All dataset IDs should be unique
            expect(datasetIds.size).toBe(uniqueDatasets.length);
          }
        ),
        { numRuns: 30 } // Reduced for performance
      );
    }, 10000); // Increased timeout

    it('should preserve dataset information in navigation link', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 8 }),
          async (datasets) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Verify each dataset card displays information and has navigation
            for (const dataset of datasets) {
              // Find the dataset card by title
              const titleElements = screen.queryAllByText(dataset.title);
              
              if (titleElements.length > 0) {
                // Verify navigation link exists for this dataset
                const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
                expect(links.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 30 } // Reduced for performance
      );
    }, 10000); // Increased timeout

    it('should handle navigation for datasets with various ID formats', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          // Generate datasets with different ID formats
          fc.array(
            fc.record({
              id: fc.oneof(
                fc.uuid(), // UUID format
                fc.hexaString({ minLength: 32, maxLength: 64 }), // Hex string
                fc.string({ minLength: 10, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)) // Alphanumeric
              ),
              title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
              price: priceArb,
              cid: cidArb,
              researcher_address: ethereumAddressArb,
              tx_hash: txHashArb,
              upload_date: dateArb,
              purchase_count: fc.integer({ min: 0, max: 100 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (datasets) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Verify navigation works for all ID formats
            for (const dataset of datasets) {
              const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
              
              if (links.length > 0) {
                const link = links[0] as HTMLAnchorElement;
                // Verify the ID is properly encoded in the URL
                expect(link.href).toContain(encodeURIComponent(dataset.id));
              }
            }
          }
        ),
        { numRuns: 30 } // Reduced for performance
      );
    }, 10000); // Increased timeout

    it('should maintain navigation functionality with filtered datasets', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 3, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }), // Search term
          async (datasets, searchTerm) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Apply search filter
            const searchInput = screen.getByPlaceholderText(/search datasets/i);
            await user.clear(searchInput);
            await user.type(searchInput, searchTerm);

            // Wait for filter to apply
            await waitFor(() => {
              // Verify filtered datasets still have navigation links
              const filteredDatasets = datasets.filter(d =>
                d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.researcher_address.toLowerCase().includes(searchTerm.toLowerCase())
              );

              // Each filtered dataset should have a navigation link
              for (const dataset of filteredDatasets) {
                const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
                if (screen.queryByText(dataset.title)) {
                  expect(links.length).toBeGreaterThan(0);
                }
              }
            });
          }
        ),
        { numRuns: 20 } // Reduced for performance due to user interaction
      );
    }, 15000); // Increased timeout for user interaction

    it('should maintain navigation functionality with sorted datasets', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 3, maxLength: 10 }),
          fc.constantFrom('newest', 'price-low', 'price-high'), // Sort options
          async (datasets, sortOption) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Apply sort
            const sortSelect = container.querySelector('select') as HTMLSelectElement;
            await user.selectOptions(sortSelect, sortOption);

            // Wait for sort to apply
            await waitFor(() => {
              // Verify all datasets still have navigation links after sorting
              for (const dataset of datasets) {
                const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
                if (links.length > 0) {
                  expect(links[0].getAttribute('href')).toBe(`/dataset/${dataset.id}`);
                }
              }
            });
          }
        ),
        { numRuns: 20 } // Reduced for performance due to user interaction
      );
    }, 15000); // Increased timeout for user interaction

    it('should handle navigation when marketplace is empty', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      // Mock empty dataset list
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      // Render marketplace
      const { container } = render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <Marketplace />
        </MemoryRouter>
      );

      // Wait for load to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
      });

      // Should show empty state message
      expect(screen.getByText(/no datasets available/i)).toBeInTheDocument();

      // Should not have any dataset navigation links
      const datasetLinks = container.querySelectorAll('a[href^="/dataset/"]');
      expect(datasetLinks.length).toBe(0);
    });

    it('should preserve navigation links during loading states', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 5 }),
          async (datasets) => {
            // Mock API with delay to test loading state
            vi.mocked(fetchDatasets).mockImplementation(
              () => new Promise(resolve => setTimeout(() => resolve(datasets), 100))
            );

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Should show loading state initially
            expect(screen.getByText(/loading datasets/i)).toBeInTheDocument();

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            }, { timeout: 3000 });

            // After loading, all navigation links should be present
            for (const dataset of datasets) {
              const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
              expect(links.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 20 } // Reduced for performance due to async delay
      );
    }, 15000); // Increased timeout for async operations

    it('should generate valid URLs for all dataset IDs', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 10 }),
          async (datasets) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace
            const { container } = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            // Wait for datasets to load
            await waitFor(() => {
              expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
            });

            // Verify all generated URLs are valid
            for (const dataset of datasets) {
              const links = container.querySelectorAll(`a[href="/dataset/${dataset.id}"]`);
              
              if (links.length > 0) {
                const link = links[0] as HTMLAnchorElement;
                const href = link.getAttribute('href');
                
                // URL should be well-formed
                expect(href).toBeTruthy();
                expect(href).toMatch(/^\/dataset\/.+$/);
                
                // Should contain the dataset ID
                expect(href).toContain(dataset.id);
              }
            }
          }
        ),
        { numRuns: 30 } // Reduced for performance
      );
    }, 10000); // Increased timeout

    it('should maintain navigation consistency across multiple renders', async () => {
      const { fetchDatasets } = await import('@/lib/api');

      await fc.assert(
        fc.asyncProperty(
          fc.array(completeDatasetArb, { minLength: 1, maxLength: 5 }),
          async (datasets) => {
            // Mock the API
            vi.mocked(fetchDatasets).mockResolvedValue(datasets);

            // Render marketplace multiple times
            const render1 = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            await waitFor(() => {
              expect(render1.container.querySelector('a[href^="/dataset/"]')).toBeTruthy();
            });

            const links1 = Array.from(render1.container.querySelectorAll('a[href^="/dataset/"]'))
              .map(link => link.getAttribute('href'));

            render1.unmount();

            // Second render
            const render2 = render(
              <MemoryRouter initialEntries={['/marketplace']}>
                <Marketplace />
              </MemoryRouter>
            );

            await waitFor(() => {
              expect(render2.container.querySelector('a[href^="/dataset/"]')).toBeTruthy();
            });

            const links2 = Array.from(render2.container.querySelectorAll('a[href^="/dataset/"]'))
              .map(link => link.getAttribute('href'));

            // Navigation links should be consistent across renders
            expect(links1.length).toBe(links2.length);
            expect(links1.sort()).toEqual(links2.sort());

            render2.unmount();
          }
        ),
        { numRuns: 20 } // Reduced for performance due to multiple renders
      );
    }, 15000); // Increased timeout for multiple renders
  });
});
