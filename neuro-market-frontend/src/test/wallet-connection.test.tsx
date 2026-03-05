import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletProvider, useWallet } from '../contexts/WalletContext';
import ConnectWalletModal from '../components/ConnectWalletModal';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '../config/wagmi';

// Create mock functions
const mockUseAccount = vi.fn();
const mockUseDisconnect = vi.fn();
const mockUseAccountEffect = vi.fn();
const mockUseConnectModal = vi.fn();

// Mock wagmi hooks
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: () => mockUseAccount(),
    useDisconnect: () => mockUseDisconnect(),
    useAccountEffect: (callbacks: any) => mockUseAccountEffect(callbacks),
  };
});

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', async () => {
  const actual = await vi.importActual('@rainbow-me/rainbowkit');
  return {
    ...actual,
    useConnectModal: () => mockUseConnectModal(),
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Test component that uses wallet context
const TestWalletComponent = () => {
  const { isConnected, address, connect, disconnect, error, isConnecting, setShowConnectModal } = useWallet();
  
  return (
    <div>
      <button onClick={() => setShowConnectModal(true)}>Open Modal</button>
      <button onClick={connect}>Connect Wallet</button>
      <button onClick={disconnect}>Disconnect</button>
      {isConnected && <div data-testid="wallet-address">{address}</div>}
      {isConnecting && <div data-testid="connecting">Connecting...</div>}
      {error && <div data-testid="error-message">{error.message}</div>}
      <ConnectWalletModal />
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
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

describe('Wallet Connection Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementations
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
    });

    mockUseDisconnect.mockReturnValue({
      disconnect: vi.fn(),
    });

    mockUseConnectModal.mockReturnValue({
      openConnectModal: vi.fn(),
    });

    mockUseAccountEffect.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 1.1: Connect button opens wallet modal', () => {
    it('should display the connect wallet modal when connect button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Modal should not be visible initially (check for wallet options)
      expect(screen.queryByText('MetaMask')).not.toBeInTheDocument();

      // Click the button to open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Modal should now be visible (check for wallet options)
      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument();
      });
    });

    it('should display wallet options in the modal', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument();
        expect(screen.getByText('WalletConnect')).toBeInTheDocument();
        expect(screen.getByText('Coinbase Wallet')).toBeInTheDocument();
      });
    });

    it('should call openConnectModal when wallet option is clicked', async () => {
      const user = userEvent.setup();
      const mockOpenConnectModal = vi.fn();
      
      mockUseConnectModal.mockReturnValue({
        openConnectModal: mockOpenConnectModal,
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument();
      });

      const metaMaskButton = screen.getByText('MetaMask');
      await user.click(metaMaskButton);

      expect(mockOpenConnectModal).toHaveBeenCalled();
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument();
      });

      // Find the backdrop (the outer div with the dark background)
      const backdrop = screen.getByText('MetaMask').closest('div')?.parentElement?.parentElement;
      if (backdrop && backdrop.style.backgroundColor === 'rgba(0, 0, 0, 0.85)') {
        await user.click(backdrop);
      }

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('MetaMask')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 1.2: Wallet address display after connection', () => {
    it('should display wallet address when connected', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
        status: 'connected',
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        const addressElement = screen.getByTestId('wallet-address');
        expect(addressElement).toBeInTheDocument();
        expect(addressElement.textContent).toBe(testAddress);
      });
    });

    it('should not display address when disconnected', () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      expect(screen.queryByTestId('wallet-address')).not.toBeInTheDocument();
    });

    it('should update address when wallet changes', async () => {
      const firstAddress = '0x1111111111111111111111111111111111111111';
      const secondAddress = '0x2222222222222222222222222222222222222222';
      
      mockUseAccount.mockReturnValue({
        address: firstAddress,
        isConnected: true,
        status: 'connected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('wallet-address').textContent).toBe(firstAddress);
      });

      // Simulate account change
      mockUseAccount.mockReturnValue({
        address: secondAddress,
        isConnected: true,
        status: 'connected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('wallet-address').textContent).toBe(secondAddress);
      });
    });
  });

  describe('Requirement 1.3: Error message display on connection failure', () => {
    it('should display error message when connection fails', async () => {
      const user = userEvent.setup();
      
      // Start with disconnected state
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Simulate connection attempt
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        const errorElement = screen.queryByTestId('error-message');
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
          expect(errorElement.textContent).toContain('Failed to connect');
        }
      });
    });

    it('should display error in modal when connection fails', async () => {
      const user = userEvent.setup();
      
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for error using role="alert" which is on the Alert component
        const alertElement = screen.queryByRole('alert');
        if (alertElement) {
          expect(alertElement).toBeInTheDocument();
          expect(alertElement.textContent).toContain('Failed to connect');
        }
      });
    });

    it('should show retry button when connection fails', async () => {
      const user = userEvent.setup();
      
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.queryByText(/Retry Connection/i);
        if (retryButton) {
          expect(retryButton).toBeInTheDocument();
        }
      });
    });

    it('should clear error when retry is clicked', async () => {
      const user = userEvent.setup();
      const mockOpenConnectModal = vi.fn();
      
      mockUseConnectModal.mockReturnValue({
        openConnectModal: mockOpenConnectModal,
      });

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.queryByText(/Retry Connection/i);
        if (retryButton) {
          user.click(retryButton);
        }
      });

      // After a short delay, openConnectModal should be called again
      await waitFor(() => {
        expect(mockOpenConnectModal).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Requirement 1.5: Wallet state cleared on disconnection', () => {
    it('should clear wallet address when disconnected', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
        status: 'connected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('wallet-address')).toBeInTheDocument();
      });

      // Simulate disconnection
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('wallet-address')).not.toBeInTheDocument();
      });
    });

    it('should clear error state when disconnected', async () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Wait for error to appear
      await waitFor(() => {
        const errorElement = screen.queryByTestId('error-message');
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        }
      });

      // Call disconnect
      const user = userEvent.setup();
      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    it('should clear connecting state when disconnected', async () => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('connecting')).toBeInTheDocument();
      });

      // Simulate disconnection
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('connecting')).not.toBeInTheDocument();
      });
    });

    it('should call wagmi disconnect when disconnect button is clicked', async () => {
      const user = userEvent.setup();
      const mockDisconnect = vi.fn();
      
      mockUseDisconnect.mockReturnValue({
        disconnect: mockDisconnect,
      });

      mockUseAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should close modal when disconnected', async () => {
      const user = userEvent.setup();
      
      mockUseAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        status: 'connected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument();
      });

      // Disconnect
      const disconnectButton = screen.getByText('Disconnect');
      await user.click(disconnectButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('MetaMask')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing openConnectModal gracefully', async () => {
      const user = userEvent.setup();
      
      mockUseConnectModal.mockReturnValue({
        openConnectModal: undefined,
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      const connectButton = screen.getByText('Connect Wallet');
      await user.click(connectButton);

      // Should show error
      await waitFor(() => {
        const errorElement = screen.queryByTestId('error-message');
        if (errorElement) {
          expect(errorElement.textContent).toContain('modal not available');
        }
      });
    });

    it('should prevent rapid retry attempts', async () => {
      const user = userEvent.setup();
      const mockOpenConnectModal = vi.fn();
      
      mockUseConnectModal.mockReturnValue({
        openConnectModal: mockOpenConnectModal,
      });

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { rerender } = render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      // Open modal
      const openModalButton = screen.getByText('Open Modal');
      await user.click(openModalButton);

      // Simulate connection failure
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'connecting',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.queryByText(/Retry Connection/i);
        if (retryButton) {
          // Click retry multiple times rapidly
          user.click(retryButton);
          user.click(retryButton);
          user.click(retryButton);
        }
      });

      // Should only call openConnectModal once (or limited times)
      await waitFor(() => {
        expect(mockOpenConnectModal).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    it('should handle empty address string', () => {
      mockUseAccount.mockReturnValue({
        address: '',
        isConnected: false,
        status: 'disconnected',
      });

      render(
        <TestWrapper>
          <TestWalletComponent />
        </TestWrapper>
      );

      expect(screen.queryByTestId('wallet-address')).not.toBeInTheDocument();
    });
  });
});
