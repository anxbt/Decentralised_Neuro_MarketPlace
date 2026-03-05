/**
 * Unit tests for PurchaseModal component
 * Tests purchase error handling for different failure scenarios
 * Validates Requirement 5.5: Purchase error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchaseModal from './PurchaseModal';
import * as contract from '@/lib/contract';
import * as api from '@/lib/api';
import * as synapseStorage from '@/lib/synapseStorage';
import * as lit from '@/lib/lit';

// Mock dependencies
vi.mock('@/lib/contract');
vi.mock('@/lib/api');
vi.mock('@/lib/synapseStorage');
vi.mock('@/lib/lit');
vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PurchaseModal - Error Handling', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    datasetId: 'test-dataset-1',
    datasetName: 'Test EEG Dataset',
    datasetCid: 'QmTest123',
    price: '1.5',
    hasAccess: false,
    onPurchaseSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Insufficient Balance Errors', () => {
    it('should display user-friendly error for insufficient funds', async () => {
      // Mock purchase to throw insufficient funds error
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        code: 'INSUFFICIENT_FUNDS',
        message: 'insufficient funds for gas * price + value',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/insufficient tFIL balance/i)).toBeInTheDocument();
        expect(screen.getByText(/you need 1\.5 tFIL/i)).toBeInTheDocument();
      });
    });

    it('should display error for insufficient balance message variant', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Insufficient tFIL balance',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/insufficient tFIL balance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Transaction Rejection Errors', () => {
    it('should display error when user rejects transaction', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        code: 'ACTION_REJECTED',
        message: 'User rejected the transaction',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/transaction was rejected/i)).toBeInTheDocument();
        expect(screen.getByText(/try again when you're ready/i)).toBeInTheDocument();
      });
    });

    it('should display error for user rejected message variant', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Transaction rejected by user',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/transaction was rejected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Contract Revert Errors', () => {
    it('should display error when dataset does not exist', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Dataset does not exist',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/dataset no longer exists/i)).toBeInTheDocument();
        expect(screen.getByText(/may have been removed/i)).toBeInTheDocument();
      });
    });

    it('should display error for incorrect payment amount', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Incorrect payment amount',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/payment amount mismatch/i)).toBeInTheDocument();
        expect(screen.getByText(/dataset price is 1\.5 tFIL/i)).toBeInTheDocument();
      });
    });

    it('should display error when already purchased', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Already purchased',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/already purchased this dataset/i)).toBeInTheDocument();
        expect(screen.getByText(/refresh the page to download/i)).toBeInTheDocument();
      });
    });

    it('should display error when payment transfer fails', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Payment transfer failed',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/payment transfer to researcher failed/i)).toBeInTheDocument();
        expect(screen.getByText(/network issue/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Errors', () => {
    it('should display error for network timeout', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        code: 'TIMEOUT',
        message: 'Request timeout',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });
    });

    it('should display error for network error code', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Gas Estimation Errors', () => {
    it('should display error for unpredictable gas limit', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        code: 'UNPREDICTABLE_GAS_LIMIT',
        message: 'Cannot estimate gas',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/transaction may fail/i)).toBeInTheDocument();
        expect(screen.getByText(/enough tFIL for both the purchase and gas fees/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when purchase fails', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Network error',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });

    it('should retry purchase when retry button is clicked', async () => {
      // First call fails, second succeeds
      vi.mocked(contract.purchaseDataset)
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockResolvedValueOnce({
          hash: '0xabc123',
          wait: vi.fn().mockResolvedValue({ blockNumber: 12345 }),
        });

      vi.mocked(api.recordPurchase).mockResolvedValue(undefined);

      render(<PurchaseModal {...mockProps} />);

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText(/retry/i);
      await userEvent.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(mockProps.onPurchaseSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Application State Maintenance', () => {
    it('should maintain modal state after error', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Network error',
      });

      render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Modal should still be open
      expect(screen.getByText(mockProps.datasetName)).toBeInTheDocument();
      expect(screen.getByText(`${mockProps.price} tFIL`)).toBeInTheDocument();
    });

    it('should clear error state when modal reopens', async () => {
      vi.mocked(contract.purchaseDataset).mockRejectedValue({
        message: 'Network error',
      });

      const { rerender } = render(<PurchaseModal {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Close and reopen modal
      rerender(<PurchaseModal {...mockProps} isOpen={false} />);
      rerender(<PurchaseModal {...mockProps} isOpen={true} />);

      // Error should be cleared (modal will auto-start purchase again)
      await waitFor(() => {
        expect(contract.purchaseDataset).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Download Error Handling', () => {
    const downloadProps = {
      ...mockProps,
      hasAccess: true,
    };

    it('should display error for access denied during download', async () => {
      vi.mocked(synapseStorage.getSynapseManager).mockReturnValue({
        initialize: vi.fn().mockResolvedValue(undefined),
        downloadFile: vi.fn().mockRejectedValue({
          message: 'Access denied',
        }),
      } as any);

      render(<PurchaseModal {...downloadProps} />);

      // Click download button
      await waitFor(() => {
        expect(screen.getByText(/download eeg file/i)).toBeInTheDocument();
      });

      const downloadButton = screen.getByText(/download eeg file/i);
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/don't own this dataset/i)).toBeInTheDocument();
      });
    });

    it('should display error for decryption failure', async () => {
      vi.mocked(synapseStorage.getSynapseManager).mockReturnValue({
        initialize: vi.fn().mockResolvedValue(undefined),
        downloadFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      } as any);

      vi.mocked(lit.decryptFile).mockRejectedValue({
        message: 'Decryption failed',
      });

      render(<PurchaseModal {...downloadProps} />);

      await waitFor(() => {
        expect(screen.getByText(/download eeg file/i)).toBeInTheDocument();
      });

      const downloadButton = screen.getByText(/download eeg file/i);
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/decryption failed/i)).toBeInTheDocument();
      });
    });

    it('should display error for storage fetch failure', async () => {
      vi.mocked(synapseStorage.getSynapseManager).mockReturnValue({
        initialize: vi.fn().mockResolvedValue(undefined),
        downloadFile: vi.fn().mockRejectedValue({
          message: 'Synapse storage error',
        }),
      } as any);

      render(<PurchaseModal {...downloadProps} />);

      await waitFor(() => {
        expect(screen.getByText(/download eeg file/i)).toBeInTheDocument();
      });

      const downloadButton = screen.getByText(/download eeg file/i);
      await userEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch file from filecoin storage/i)).toBeInTheDocument();
      });
    });
  });
});
