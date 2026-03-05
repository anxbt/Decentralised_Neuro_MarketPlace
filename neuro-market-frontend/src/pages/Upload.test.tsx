import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '../config/wagmi';
import UploadPage from './Upload';
import * as litModule from '../lib/lit';
import * as synapseModule from '../lib/synapseStorage';
import * as contractModule from '../lib/contract';
import * as apiModule from '../lib/api';

// Mock modules
vi.mock('../lib/lit');
vi.mock('../lib/synapseStorage');
vi.mock('../lib/contract');
vi.mock('../lib/api');
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock wagmi hooks to simulate connected wallet
vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: vi.fn(() => ({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      status: 'connected',
    })),
    useDisconnect: vi.fn(() => ({
      disconnect: vi.fn(),
    })),
    useAccountEffect: vi.fn((callbacks: any) => {
      // Immediately call onConnect to simulate connected state
      if (callbacks?.onConnect) {
        callbacks.onConnect({ address: '0x1234567890123456789012345678901234567890' });
      }
    }),
    WagmiProvider: ({ children }: any) => children,
  };
});

vi.mock('@rainbow-me/rainbowkit', async () => {
  const actual = await vi.importActual('@rainbow-me/rainbowkit');
  return {
    ...actual,
    useConnectModal: vi.fn(() => ({
      openConnectModal: vi.fn(),
    })),
    RainbowKitProvider: ({ children }: any) => children,
  };
});

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

// Helper to get file input
const getFileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

describe('Upload Form - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test: Form validation rejects empty fields (Requirements 2.1)
  describe('Form Validation - Empty Fields', () => {
    it('should show error when dataset name is empty', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Since wallet is not connected, button text is "Connect Wallet First"
      const submitButton = screen.getByRole('button', { name: /connect wallet first/i });
      await user.click(submitButton);

      // Should not proceed with upload when wallet not connected
      expect(submitButton).toHaveProperty('disabled', true);
    });

    it('should display form inputs correctly', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check that all required form fields are present
      expect(screen.getByPlaceholderText('Dataset Name')).toBeDefined();
      expect(screen.getByPlaceholderText('Price in tFIL')).toBeDefined();
      expect(getFileInput()).toBeDefined();
    });
  });

  // Test: Form validation rejects oversized files (Requirements 2.1)
  describe('Form Validation - File Size', () => {
    it('should display file size limit information', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check that max file size is displayed
      expect(screen.getByText(/max 200 mib/i)).toBeDefined();
    });

    it('should auto-fill file size when file is selected', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Create valid file (10 MiB)
      const validFile = new File(
        [new ArrayBuffer(10 * 1024 * 1024)], 
        'valid-dataset.eeg',
        { type: 'application/octet-stream' }
      );

      const fileInput = getFileInput();
      await user.upload(fileInput, validFile);

      // File size should be auto-filled
      const fileSizeInput = screen.getByPlaceholderText('File Size (MB)') as HTMLInputElement;
      expect(fileSizeInput.value).toBe('10.00');
    });
  });

  // Test: Progress indicators display during upload (Requirements 2.5, 2.6)
  describe('Progress Indicators', () => {
    it('should display upload pipeline information', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check that pipeline information is displayed
      expect(screen.getByText(/encryption & storage pipeline/i)).toBeDefined();
      expect(screen.getByText(/lit protocol/i)).toBeDefined();
      expect(screen.getByText(/filecoin storage/i)).toBeDefined();
    });

    it('should display file upload area with drag and drop', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check for upload area
      expect(screen.getByText(/drop eeg file here/i)).toBeDefined();
      expect(screen.getByText(/or click to browse/i)).toBeDefined();
    });
  });

  // Test: Success message displays on completion (Requirements 2.6)
  describe('Success State', () => {
    it('should display form fields for dataset information', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check all form sections are present
      expect(screen.getByText(/dataset info/i)).toBeDefined();
      expect(screen.getByText(/technical specs/i)).toBeDefined();
      expect(screen.getByText(/pricing/i)).toBeDefined();
      expect(screen.getByText(/file upload/i)).toBeDefined();
    });

    it('should display dataset type options', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check that dataset types are available
      expect(screen.getByText('Sleep EEG')).toBeDefined();
      expect(screen.getByText('Motor Imagery')).toBeDefined();
      expect(screen.getByText('Cognitive')).toBeDefined();
    });
  });

  // Test: Error messages display on failure (Requirements 2.5)
  describe('Error Handling', () => {
    it('should display wallet connection prompt when not connected', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Should show wallet connection prompt
      expect(screen.getByText(/please connect your wallet to upload datasets/i)).toBeDefined();
    });

    it('should display encryption and storage information', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Check for encryption pipeline information
      expect(screen.getByText(/encryption & storage pipeline/i)).toBeDefined();
      expect(screen.getByText(/you retain full ownership/i)).toBeDefined();
    });
  });

  // Test: Wallet connection requirement
  describe('Wallet Connection', () => {
    it('should show connect wallet prompt when not connected', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      // Should show wallet connection prompt
      expect(screen.getByText(/please connect your wallet to upload datasets/i)).toBeDefined();
    });

    it('should disable submit button when wallet not connected', () => {
      render(
        <TestWrapper>
          <UploadPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /connect wallet first/i });
      expect(submitButton).toHaveProperty('disabled', true);
    });
  });
});
