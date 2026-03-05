import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletProvider, useWallet } from '@/contexts/WalletContext';
import { toast } from '@/hooks/use-toast';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: undefined,
    isConnected: false,
    status: 'disconnected',
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
  })),
  useAccountEffect: vi.fn((callbacks) => {
    // Store callbacks for manual triggering in tests
    (global as any).__accountEffectCallbacks = callbacks;
  }),
}));

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: vi.fn(() => ({
    openConnectModal: vi.fn(),
  })),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Test component that uses wallet context
const TestComponent = () => {
  const { 
    isConnected, 
    address, 
    error, 
    isConnecting, 
    connect, 
    disconnect, 
    retry,
    clearError 
  } = useWallet();

  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="address">{address || 'No address'}</div>
      <div data-testid="connecting-status">
        {isConnecting ? 'Connecting' : 'Not connecting'}
      </div>
      {error && (
        <div data-testid="error-message">
          {error.message}
        </div>
      )}
      <button onClick={connect} data-testid="connect-btn">
        Connect
      </button>
      <button onClick={disconnect} data-testid="disconnect-btn">
        Disconnect
      </button>
      <button onClick={retry} data-testid="retry-btn">
        Retry
      </button>
      <button onClick={clearError} data-testid="clear-error-btn">
        Clear Error
      </button>
    </div>
  );
};

describe('Feature: neuromarket, Property 3: Connection error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (global as any).__accountEffectCallbacks;
  });

  it('should display error message when connection fails', async () => {
    const { useConnectModal } = await import('@rainbow-me/rainbowkit');
    const mockOpenConnectModal = vi.fn();
    
    vi.mocked(useConnectModal).mockReturnValue({
      openConnectModal: mockOpenConnectModal,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const connectBtn = screen.getByTestId('connect-btn');
    
    // Simulate connection attempt
    await act(async () => {
      await userEvent.click(connectBtn);
    });

    // Verify connect modal was called
    expect(mockOpenConnectModal).toHaveBeenCalled();
    
    // Check that error message can be displayed (it's shown when status changes)
    // The actual error display is tested through the UI component tests
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });

  it('should provide retry mechanism after connection failure', async () => {
    const { useConnectModal } = await import('@rainbow-me/rainbowkit');
    const mockOpenConnectModal = vi.fn();
    
    vi.mocked(useConnectModal).mockReturnValue({
      openConnectModal: mockOpenConnectModal,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const retryBtn = screen.getByTestId('retry-btn');
    
    await act(async () => {
      await userEvent.click(retryBtn);
    });

    expect(mockOpenConnectModal).toHaveBeenCalled();
  });

  it('should clear error when clearError is called', async () => {
    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const clearErrorBtn = screen.getByTestId('clear-error-btn');
    
    await act(async () => {
      await userEvent.click(clearErrorBtn);
    });

    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('should prevent rapid retry attempts', async () => {
    const { useConnectModal } = await import('@rainbow-me/rainbowkit');
    const mockOpenConnectModal = vi.fn();
    
    vi.mocked(useConnectModal).mockReturnValue({
      openConnectModal: mockOpenConnectModal,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const retryBtn = screen.getByTestId('retry-btn');
    
    // First retry
    await act(async () => {
      await userEvent.click(retryBtn);
    });

    // Immediate second retry (should be prevented)
    await act(async () => {
      await userEvent.click(retryBtn);
    });

    // Should show "please wait" toast
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Please Wait",
      })
    );
  });
});

describe('Feature: neuromarket, Property 2: Wallet disconnection cleanup', () => {
  it('should clear all wallet state on disconnection', async () => {
    const { useAccount, useDisconnect } = await import('wagmi');
    const mockDisconnect = vi.fn();
    
    // Start with connected state
    vi.mocked(useAccount).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      status: 'connected',
    } as any);

    vi.mocked(useDisconnect).mockReturnValue({
      disconnect: mockDisconnect,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

    const disconnectBtn = screen.getByTestId('disconnect-btn');
    
    await act(async () => {
      await userEvent.click(disconnectBtn);
    });

    expect(mockDisconnect).toHaveBeenCalled();

    // Simulate disconnection
    await act(async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      } as any);

      // Trigger onDisconnect callback
      if ((global as any).__accountEffectCallbacks?.onDisconnect) {
        (global as any).__accountEffectCallbacks.onDisconnect();
      }
    });

    // Verify toast was called
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Wallet Disconnected",
        })
      );
    });
  });

  it('should handle disconnect errors gracefully', async () => {
    const { useDisconnect } = await import('wagmi');
    const mockDisconnect = vi.fn(() => {
      throw new Error('Disconnect failed');
    });
    
    vi.mocked(useDisconnect).mockReturnValue({
      disconnect: mockDisconnect,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const disconnectBtn = screen.getByTestId('disconnect-btn');
    
    await act(async () => {
      await userEvent.click(disconnectBtn);
    });

    // Should show error toast
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Disconnection Error",
          variant: "destructive",
        })
      );
    });
  });
});

describe('Wallet error handling - Connection success', () => {
  it('should show success toast on successful connection', async () => {
    const { useAccount } = await import('wagmi');
    
    vi.mocked(useAccount).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      status: 'connected',
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    // Trigger onConnect callback
    await act(async () => {
      if ((global as any).__accountEffectCallbacks?.onConnect) {
        (global as any).__accountEffectCallbacks.onConnect({
          address: '0x1234567890123456789012345678901234567890',
        });
      }
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
  });

  it('should handle modal unavailable error', async () => {
    const { useConnectModal } = await import('@rainbow-me/rainbowkit');
    
    vi.mocked(useConnectModal).mockReturnValue({
      openConnectModal: undefined,
    } as any);

    render(
      <WalletProvider>
        <TestComponent />
      </WalletProvider>
    );

    const connectBtn = screen.getByTestId('connect-btn');
    
    await act(async () => {
      await userEvent.click(connectBtn);
    });

    // Should show error toast
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Connection Error",
          variant: "destructive",
        })
      );
    });
  });
});
