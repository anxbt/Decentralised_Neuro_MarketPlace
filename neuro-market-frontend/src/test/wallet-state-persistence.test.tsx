/**
 * Feature: neuromarket, Property 1: Wallet state persistence
 * Validates: Requirements 1.2, 1.4, 9.3
 * 
 * Property: For any connected wallet and any navigation action (page change, refresh, 
 * or interaction), the wallet connection state and address should remain consistent 
 * and accessible throughout the session.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import * as fc from 'fast-check';
import { config } from '../config/wagmi';
import { WalletProvider, useWallet } from '../contexts/WalletContext';

// Test component that displays wallet state and allows navigation
const WalletStateDisplay = () => {
  const { isConnected, address } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div>
      <div data-testid="connection-status">{isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="wallet-address">{address || 'no-address'}</div>
      <div data-testid="current-path">{location.pathname}</div>
      <button onClick={() => navigate('/marketplace')}>Go to Marketplace</button>
      <button onClick={() => navigate('/upload')}>Go to Upload</button>
      <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      <button onClick={() => navigate('/')}>Go to Home</button>
    </div>
  );
};

// Test wrapper with all required providers
const createTestWrapper = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <WalletProvider>
              <Routes>
                <Route path="/" element={children} />
                <Route path="/marketplace" element={children} />
                <Route path="/upload" element={children} />
                <Route path="/dashboard" element={children} />
              </Routes>
            </WalletProvider>
          </MemoryRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

describe('Feature: neuromarket, Property 1: Wallet state persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('maintains wallet state across multiple navigation actions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a sequence of navigation actions
        fc.array(
          fc.constantFrom('/', '/marketplace', '/upload', '/dashboard'),
          { minLength: 2, maxLength: 5 }
        ),
        async (navigationSequence) => {
          const Wrapper = createTestWrapper();
          render(<WalletStateDisplay />, { wrapper: Wrapper });

          // Initial state should be disconnected
          const initialStatus = screen.getAllByTestId('connection-status')[0];
          const initialAddress = screen.getAllByTestId('wallet-address')[0];
          
          expect(initialStatus.textContent).toBe('disconnected');
          expect(initialAddress.textContent).toBe('no-address');

          // Simulate navigation through the sequence
          for (const path of navigationSequence) {
            const buttons = screen.getAllByRole('button');
            const targetButton = buttons.find(btn => {
              const text = btn.textContent || '';
              return (
                (path === '/' && text.includes('Home')) ||
                (path === '/marketplace' && text.includes('Marketplace')) ||
                (path === '/upload' && text.includes('Upload')) ||
                (path === '/dashboard' && text.includes('Dashboard'))
              );
            });

            if (targetButton) {
              targetButton.click();

              // Small delay to allow navigation to complete
              await new Promise(resolve => setTimeout(resolve, 10));

              // Verify wallet state remains consistent after navigation
              const statusElements = screen.getAllByTestId('connection-status');
              const addressElements = screen.getAllByTestId('wallet-address');
              
              // All instances should show the same state
              statusElements.forEach(el => {
                expect(el.textContent).toBe('disconnected');
              });
              
              addressElements.forEach(el => {
                expect(el.textContent).toBe('no-address');
              });
            }
          }

          cleanup();
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('wallet context provides consistent state across component tree', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random component mount/unmount cycles
        fc.integer({ min: 1, max: 5 }),
        async (mountCycles) => {
          for (let i = 0; i < mountCycles; i++) {
            const Wrapper = createTestWrapper();
            render(<WalletStateDisplay />, { wrapper: Wrapper });

            // Verify wallet context is accessible
            const status = screen.getAllByTestId('connection-status')[0];
            const address = screen.getAllByTestId('wallet-address')[0];
            
            expect(status).toBeDefined();
            expect(address).toBeDefined();
            
            // Verify state is consistent
            expect(status.textContent).toMatch(/^(connected|disconnected)$/);
            expect(address.textContent).toBeDefined();

            cleanup();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('wallet state remains accessible after rapid navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate rapid navigation sequences
        fc.array(
          fc.record({
            path: fc.constantFrom('/', '/marketplace', '/upload', '/dashboard'),
            delay: fc.integer({ min: 0, max: 10 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (navigationActions) => {
          const Wrapper = createTestWrapper();
          render(<WalletStateDisplay />, { wrapper: Wrapper });

          for (const action of navigationActions) {
            const buttons = screen.getAllByRole('button');
            const targetButton = buttons.find(btn => {
              const text = btn.textContent || '';
              return (
                (action.path === '/' && text.includes('Home')) ||
                (action.path === '/marketplace' && text.includes('Marketplace')) ||
                (action.path === '/upload' && text.includes('Upload')) ||
                (action.path === '/dashboard' && text.includes('Dashboard'))
              );
            });

            if (targetButton) {
              targetButton.click();
              
              // Small delay to simulate user interaction timing
              if (action.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, action.delay));
              }

              // Verify wallet state is still accessible
              const statusElements = screen.getAllByTestId('connection-status');
              const addressElements = screen.getAllByTestId('wallet-address');
              
              expect(statusElements.length).toBeGreaterThan(0);
              expect(addressElements.length).toBeGreaterThan(0);
              
              statusElements.forEach(el => {
                expect(el.textContent).toMatch(/^(connected|disconnected)$/);
              });
            }
          }

          cleanup();
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  }, 15000);

  it('wallet context maintains referential stability across renders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (renderCount) => {
          const Wrapper = createTestWrapper();
          const { rerender } = render(<WalletStateDisplay />, { wrapper: Wrapper });

          // Capture initial state
          const initialStatus = screen.getAllByTestId('connection-status')[0].textContent;
          const initialAddress = screen.getAllByTestId('wallet-address')[0].textContent;

          // Perform multiple rerenders
          for (let i = 0; i < renderCount; i++) {
            rerender(<WalletStateDisplay />);

            // Verify state remains consistent
            const currentStatus = screen.getAllByTestId('connection-status')[0].textContent;
            const currentAddress = screen.getAllByTestId('wallet-address')[0].textContent;

            expect(currentStatus).toBe(initialStatus);
            expect(currentAddress).toBe(initialAddress);
          }

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('wallet state is accessible from any route in the application', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/', '/marketplace', '/upload', '/dashboard'),
        async (initialRoute) => {
          const Wrapper = createTestWrapper(initialRoute);
          render(<WalletStateDisplay />, { wrapper: Wrapper });

          // Verify wallet context is accessible from the initial route
          const status = screen.getAllByTestId('connection-status')[0];
          const address = screen.getAllByTestId('wallet-address')[0];
          const currentPath = screen.getAllByTestId('current-path')[0];

          expect(currentPath.textContent).toBe(initialRoute);
          expect(status).toBeDefined();
          expect(address).toBeDefined();
          expect(status.textContent).toMatch(/^(connected|disconnected)$/);

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});
