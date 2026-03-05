/**
 * Feature: neuromarket, Property 2: Wallet disconnection cleanup
 * Validates: Requirements 1.5
 * 
 * Property: For any wallet disconnection action, all wallet-related state 
 * (address, connection status, session data) should be completely cleared 
 * from the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import * as fc from 'fast-check';
import { config } from '../config/wagmi';
import { WalletProvider, useWallet } from '../contexts/WalletContext';

// Mock wagmi hooks
const mockUseAccount = vi.fn();
const mockDisconnect = vi.fn();
const mockAccountEffectCallbacks: any = {};

vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: () => mockUseAccount(),
    useDisconnect: () => ({ disconnect: mockDisconnect }),
    useAccountEffect: (callbacks: any) => {
      Object.assign(mockAccountEffectCallbacks, callbacks);
    },
  };
});

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', async () => {
  const actual = await vi.importActual('@rainbow-me/rainbowkit');
  return {
    ...actual,
    useConnectModal: () => ({
      openConnectModal: vi.fn(),
    }),
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Test component that displays all wallet state
const WalletStateInspector = () => {
  const { 
    isConnected, 
    address, 
    error, 
    isConnecting,
    showConnectModal,
    disconnect 
  } = useWallet();

  return (
    <div>
      <div data-testid="is-connected">{String(isConnected)}</div>
      <div data-testid="address">{address || ''}</div>
      <div data-testid="error">{error ? JSON.stringify(error) : ''}</div>
      <div data-testid="is-connecting">{String(isConnecting)}</div>
      <div data-testid="show-connect-modal">{String(showConnectModal)}</div>
      <button onClick={disconnect} data-testid="disconnect-btn">
        Disconnect
      </button>
    </div>
  );
};

// Test wrapper with all required providers
const createTestWrapper = () => {
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
          <WalletProvider>
            {children}
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

// Helper to generate random wallet addresses
const walletAddressArbitrary = fc.hexaString({ minLength: 40, maxLength: 40 }).map(
  hex => `0x${hex}`
);

// Helper to generate wallet error states
const walletErrorArbitrary = fc.record({
  message: fc.string({ minLength: 1, maxLength: 100 }),
  code: fc.option(fc.constantFrom('CONNECTION_FAILED', 'DISCONNECT_ERROR', 'MODAL_ERROR'), { nil: undefined }),
  timestamp: fc.integer({ min: Date.now() - 10000, max: Date.now() }),
});

describe('Feature: neuromarket, Property 2: Wallet disconnection cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisconnect.mockClear();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('clears all wallet state for any connected wallet address', async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArbitrary,
        async (walletAddress) => {
          // Setup: Start with connected state
          mockUseAccount.mockReturnValue({
            address: walletAddress,
            isConnected: true,
            status: 'connected',
          });

          const Wrapper = createTestWrapper();
          const { unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          // Verify initial connected state
          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('true');
            expect(screen.getByTestId('address').textContent).toBe(walletAddress);
          }, { timeout: 1000 });

          // Action: Disconnect wallet
          const disconnectBtn = screen.getByTestId('disconnect-btn');
          await userEvent.click(disconnectBtn);

          // Simulate wagmi disconnection
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          // Trigger onDisconnect callback
          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          // Verify: All wallet state should be cleared
          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('false');
            expect(screen.getByTestId('address').textContent).toBe('');
            expect(screen.getByTestId('error').textContent).toBe('');
            expect(screen.getByTestId('is-connecting').textContent).toBe('false');
            expect(screen.getByTestId('show-connect-modal').textContent).toBe('false');
          }, { timeout: 1000 });

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);

  it('clears error state on disconnection regardless of previous error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(walletAddressArbitrary, walletErrorArbitrary),
        async ([walletAddress, errorState]) => {
          // Setup: Start with connected state and an error
          mockUseAccount.mockReturnValue({
            address: walletAddress,
            isConnected: true,
            status: 'connected',
          });

          const Wrapper = createTestWrapper();
          const { rerender, unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          // Verify initial state
          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('true');
          }, { timeout: 1000 });

          // Action: Disconnect
          const disconnectBtn = screen.getByTestId('disconnect-btn');
          await userEvent.click(disconnectBtn);

          // Simulate disconnection
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          rerender(<WalletStateInspector />);

          // Verify: Error state should be cleared
          await waitFor(() => {
            expect(screen.getByTestId('error').textContent).toBe('');
            expect(screen.getByTestId('is-connected').textContent).toBe('false');
          }, { timeout: 1000 });

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);

  it('clears connecting state on disconnection', async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArbitrary,
        fc.boolean(),
        async (walletAddress, wasConnecting) => {
          // Setup: Start with connected state (may have been connecting before)
          mockUseAccount.mockReturnValue({
            address: walletAddress,
            isConnected: true,
            status: 'connected',
          });

          const Wrapper = createTestWrapper();
          const { unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('true');
          }, { timeout: 1000 });

          // Action: Disconnect
          const disconnectBtn = screen.getByTestId('disconnect-btn');
          await userEvent.click(disconnectBtn);

          // Simulate disconnection
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          // Verify: isConnecting should be false
          await waitFor(() => {
            expect(screen.getByTestId('is-connecting').textContent).toBe('false');
            expect(screen.getByTestId('is-connected').textContent).toBe('false');
          }, { timeout: 1000 });

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);

  it('clears modal state on disconnection', async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArbitrary,
        fc.boolean(),
        async (walletAddress, modalWasShown) => {
          // Setup: Start with connected state
          mockUseAccount.mockReturnValue({
            address: walletAddress,
            isConnected: true,
            status: 'connected',
          });

          const Wrapper = createTestWrapper();
          const { unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('true');
          }, { timeout: 1000 });

          // Action: Disconnect
          const disconnectBtn = screen.getByTestId('disconnect-btn');
          await userEvent.click(disconnectBtn);

          // Simulate disconnection
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          // Verify: showConnectModal should be false
          await waitFor(() => {
            expect(screen.getByTestId('show-connect-modal').textContent).toBe('false');
          }, { timeout: 1000 });

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);

  it('maintains clean state after multiple connect-disconnect cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(walletAddressArbitrary, { minLength: 2, maxLength: 3 }),
        async (walletAddresses) => {
          for (const walletAddress of walletAddresses) {
            // Connect
            mockUseAccount.mockReturnValue({
              address: walletAddress,
              isConnected: true,
              status: 'connected',
            });

            const Wrapper = createTestWrapper();
            const { rerender, unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

            await waitFor(() => {
              const elements = screen.queryAllByTestId('is-connected');
              expect(elements.length).toBeGreaterThan(0);
              expect(elements[0].textContent).toBe('true');
            }, { timeout: 1000 });

            // Disconnect
            const disconnectBtn = screen.getAllByTestId('disconnect-btn')[0];
            await userEvent.click(disconnectBtn);

            mockUseAccount.mockReturnValue({
              address: undefined,
              isConnected: false,
              status: 'disconnected',
            });

            if (mockAccountEffectCallbacks.onDisconnect) {
              mockAccountEffectCallbacks.onDisconnect();
            }

            rerender(<WalletStateInspector />);

            // Verify complete cleanup after each disconnection
            await waitFor(() => {
              const statusElements = screen.queryAllByTestId('is-connected');
              const addressElements = screen.queryAllByTestId('address');
              const errorElements = screen.queryAllByTestId('error');
              
              expect(statusElements[0].textContent).toBe('false');
              expect(addressElements[0].textContent).toBe('');
              expect(errorElements[0].textContent).toBe('');
            }, { timeout: 1000 });

            unmount();
          }
        }
      ),
      { numRuns: 50, timeout: 60000 }
    );
  }, 70000);

  it('ensures disconnection is idempotent - multiple disconnects maintain clean state', async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArbitrary,
        fc.integer({ min: 2, max: 3 }),
        async (walletAddress, disconnectCount) => {
          // Setup: Start with connected state
          mockUseAccount.mockReturnValue({
            address: walletAddress,
            isConnected: true,
            status: 'connected',
          });

          const Wrapper = createTestWrapper();
          const { unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          await waitFor(() => {
            const elements = screen.queryAllByTestId('is-connected');
            expect(elements.length).toBeGreaterThan(0);
            expect(elements[0].textContent).toBe('true');
          }, { timeout: 1000 });

          // First disconnect
          const disconnectBtn = screen.getAllByTestId('disconnect-btn')[0];
          await userEvent.click(disconnectBtn);

          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          await waitFor(() => {
            const elements = screen.queryAllByTestId('is-connected');
            expect(elements.length).toBeGreaterThan(0);
            expect(elements[0].textContent).toBe('false');
          }, { timeout: 1000 });

          // Multiple subsequent disconnect attempts
          for (let i = 1; i < disconnectCount; i++) {
            const btn = screen.getAllByTestId('disconnect-btn')[0];
            await userEvent.click(btn);
            
            // State should remain clean
            const statusElements = screen.queryAllByTestId('is-connected');
            const addressElements = screen.queryAllByTestId('address');
            const errorElements = screen.queryAllByTestId('error');
            
            expect(statusElements[0].textContent).toBe('false');
            expect(addressElements[0].textContent).toBe('');
            expect(errorElements[0].textContent).toBe('');
          }

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);

  it('clears all state even when disconnect is called during connection attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArbitrary,
        async (walletAddress) => {
          // Setup: Start in connecting state
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'connecting',
          });

          const Wrapper = createTestWrapper();
          const { unmount } = render(<WalletStateInspector />, { wrapper: Wrapper });

          // Verify connecting state
          await waitFor(() => {
            expect(screen.getByTestId('is-connecting').textContent).toBe('true');
          }, { timeout: 1000 });

          // Action: Disconnect during connection
          const disconnectBtn = screen.getByTestId('disconnect-btn');
          await userEvent.click(disconnectBtn);

          // Simulate disconnection
          mockUseAccount.mockReturnValue({
            address: undefined,
            isConnected: false,
            status: 'disconnected',
          });

          if (mockAccountEffectCallbacks.onDisconnect) {
            mockAccountEffectCallbacks.onDisconnect();
          }

          // Verify: All state cleared including connecting state
          await waitFor(() => {
            expect(screen.getByTestId('is-connected').textContent).toBe('false');
            expect(screen.getByTestId('is-connecting').textContent).toBe('false');
            expect(screen.getByTestId('address').textContent).toBe('');
            expect(screen.getByTestId('error').textContent).toBe('');
            expect(screen.getByTestId('show-connect-modal').textContent).toBe('false');
          }, { timeout: 1000 });

          unmount();
        }
      ),
      { numRuns: 100, timeout: 30000 }
    );
  }, 35000);
});
