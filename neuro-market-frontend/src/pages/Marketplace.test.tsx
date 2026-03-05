/**
 * Unit Tests for Marketplace Component
 * Feature: neuromarket
 * 
 * Tests specific examples of correct behavior for marketplace display,
 * navigation, search, and filtering functionality.
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Marketplace from './Marketplace';
import type { Dataset } from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchDatasets: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock EEGWaveform component
vi.mock('@/components/EEGWaveform', () => ({
  default: () => <div data-testid="eeg-waveform">EEG Waveform</div>,
}));

// Mock PDPProofBadge component
vi.mock('@/components/PDPProofBadge', () => ({
  default: ({ pieceCid, compact }: any) => (
    <div data-testid="pdp-proof-badge">
      PDP Proof: {pieceCid} (compact: {compact ? 'yes' : 'no'})
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// Helper function to create mock datasets
const createMockDataset = (overrides?: Partial<Dataset>): Dataset => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Sleep EEG Dataset',
  description: 'High-quality sleep study data',
  price: '1.5',
  cid: 'QmTest123456789abcdefghijklmnopqrstuvwxyz',
  researcher_address: '0x1234567890123456789012345678901234567890',
  tx_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  upload_date: '2024-01-15T10:30:00Z',
  purchase_count: 5,
  ...overrides,
});

describe('Marketplace Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Loading indicator displays while fetching
   * Validates: Requirements 4.5
   */
  describe('Loading State', () => {
    it('should display loading indicator while fetching datasets', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      // Mock API to delay response
      vi.mocked(fetchDatasets).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      // Should show loading indicator
      expect(screen.getByText(/loading datasets from blockchain/i)).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading datasets from blockchain/i)).not.toBeInTheDocument();
      });
    });

    it('should display loading spinner icon during fetch', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      // Check for spinner (Loader2 component with animate-spin class)
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      
      await waitFor(() => {
        expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Empty state message when no datasets
   * Validates: Requirements 4.4
   */
  describe('Empty State', () => {
    it('should display empty state message when no datasets available', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no datasets available yet/i)).toBeInTheDocument();
      });
    });

    it('should display "List the First Dataset" button when marketplace is empty', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const button = screen.getByText(/list the first dataset/i);
        expect(button).toBeInTheDocument();
        expect(button.closest('a')).toHaveAttribute('href', '/upload');
      });
    });

    it('should display "no datasets match your filters" when filters exclude all', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ title: 'Sleep Study' }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/sleep study/i)[0]).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const searchInput = screen.getByPlaceholderText(/search datasets/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no datasets match your filters/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Dataset cards display with correct information
   * Validates: Requirements 4.1, 4.2
   */
  describe('Dataset Display', () => {
    it('should display dataset cards with title, price, and researcher info', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        title: 'Motor Imagery EEG',
        price: '2.5',
        researcher_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check title
        expect(screen.getByText('Motor Imagery EEG')).toBeInTheDocument();
        
        // Check price
        expect(screen.getByText(/2\.5 tFIL/i)).toBeInTheDocument();
        
        // Check researcher address (truncated)
        expect(screen.getByText(/0xabcd\.\.\.ef12/i)).toBeInTheDocument();
      });
    });

    it('should display dataset description', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        description: 'Comprehensive motor imagery dataset with 64 channels',
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/comprehensive motor imagery dataset/i)).toBeInTheDocument();
      });
    });

    it('should display purchase count for each dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        purchase_count: 42,
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/42 sales/i)).toBeInTheDocument();
      });
    });

    it('should display CID for each dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        cid: 'QmTestCID123456789',
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/CID: QmTestCID123\.\.\./i)).toBeInTheDocument();
      });
    });

    it('should display PDP proof badge for each dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        cid: 'QmTestPDPProof',
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const pdpBadge = container.querySelector('[data-testid="pdp-proof-badge"]');
        expect(pdpBadge).toBeInTheDocument();
        expect(pdpBadge?.textContent).toContain('QmTestPDPProof');
      });
    });

    it('should display EEG waveform visualization for each dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset(),
      ]);

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const waveform = container.querySelector('[data-testid="eeg-waveform"]');
        expect(waveform).toBeInTheDocument();
      });
    });

    it('should display multiple datasets correctly', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: '1', title: 'Dataset 1', price: '1.0' }),
        createMockDataset({ id: '2', title: 'Dataset 2', price: '2.0' }),
        createMockDataset({ id: '3', title: 'Dataset 3', price: '3.0' }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dataset 1')).toBeInTheDocument();
        expect(screen.getByText('Dataset 2')).toBeInTheDocument();
        expect(screen.getByText('Dataset 3')).toBeInTheDocument();
        expect(screen.getByText(/1\.0 tFIL/i)).toBeInTheDocument();
        expect(screen.getByText(/2\.0 tFIL/i)).toBeInTheDocument();
        expect(screen.getByText(/3\.0 tFIL/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Clicking dataset navigates to detail page
   * Validates: Requirements 4.3
   */
  describe('Dataset Navigation', () => {
    it('should navigate to detail page when dataset card is clicked', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      const mockDataset = createMockDataset({
        id: 'test-dataset-123',
        title: 'Clickable Dataset',
      });
      
      vi.mocked(fetchDatasets).mockResolvedValue([mockDataset]);

      const { container } = render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <Marketplace />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Clickable Dataset')).toBeInTheDocument();
      });

      // Find the link to the dataset detail page
      const link = container.querySelector('a[href="/dataset/test-dataset-123"]');
      expect(link).toBeInTheDocument();
    });

    it('should have correct href for each dataset', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: 'dataset-1', title: 'Dataset 1' }),
        createMockDataset({ id: 'dataset-2', title: 'Dataset 2' }),
      ]);

      const { container } = render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <Marketplace />
        </MemoryRouter>
      );

      await waitFor(() => {
        const link1 = container.querySelector('a[href="/dataset/dataset-1"]');
        const link2 = container.querySelector('a[href="/dataset/dataset-2"]');
        
        expect(link1).toBeInTheDocument();
        expect(link2).toBeInTheDocument();
      });
    });

    it('should display "Buy & Decrypt" button on each dataset card', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset(),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/buy & decrypt →/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Search filters datasets correctly
   * Validates: Requirements 4.4
   */
  describe('Search Functionality', () => {
    it('should filter datasets by title when searching', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: '1', title: 'Sleep EEG Study' }),
        createMockDataset({ id: '2', title: 'Motor Imagery Dataset' }),
        createMockDataset({ id: '3', title: 'Cognitive Task EEG' }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sleep EEG Study')).toBeInTheDocument();
      });

      // Search for "motor"
      const searchInput = screen.getByPlaceholderText(/search datasets/i);
      await user.type(searchInput, 'motor');

      await waitFor(() => {
        // Should show Motor Imagery Dataset
        expect(screen.getByText('Motor Imagery Dataset')).toBeInTheDocument();
        
        // Should not show other datasets
        expect(screen.queryByText('Sleep EEG Study')).not.toBeInTheDocument();
        expect(screen.queryByText('Cognitive Task EEG')).not.toBeInTheDocument();
      });
    });

    it('should filter datasets by researcher address when searching', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          id: '1', 
          title: 'Dataset Alpha',
          researcher_address: '0xabcdef1234567890abcdef1234567890abcdef12'
        }),
        createMockDataset({ 
          id: '2', 
          title: 'Dataset Beta',
          researcher_address: '0x1111111111111111111111111111111111111111'
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Dataset Alpha')[0]).toBeInTheDocument();
      });

      // Search by truncated researcher address (as displayed)
      const searchInput = screen.getByPlaceholderText(/search datasets/i);
      await user.type(searchInput, '0xabcd');

      await waitFor(() => {
        expect(screen.getAllByText('Dataset Alpha')[0]).toBeInTheDocument();
        expect(screen.queryByText('Dataset Beta')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive when searching', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ title: 'Sleep EEG Study' }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sleep EEG Study')).toBeInTheDocument();
      });

      // Search with different case
      const searchInput = screen.getByPlaceholderText(/search datasets/i);
      await user.type(searchInput, 'SLEEP');

      await waitFor(() => {
        expect(screen.getByText('Sleep EEG Study')).toBeInTheDocument();
      });
    });

    it('should clear search results when search input is cleared', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: '1', title: 'Dataset 1' }),
        createMockDataset({ id: '2', title: 'Dataset 2' }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dataset 1')).toBeInTheDocument();
        expect(screen.getByText('Dataset 2')).toBeInTheDocument();
      });

      // Search to filter
      const searchInput = screen.getByPlaceholderText(/search datasets/i) as HTMLInputElement;
      await user.type(searchInput, 'Dataset 1');

      await waitFor(() => {
        expect(screen.getByText('Dataset 1')).toBeInTheDocument();
        expect(screen.queryByText('Dataset 2')).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);

      await waitFor(() => {
        const dataset1Elements = screen.getAllByText('Dataset 1');
        const dataset2Elements = screen.getAllByText('Dataset 2');
        expect(dataset1Elements.length).toBeGreaterThan(0);
        expect(dataset2Elements.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * Test: Type filters work correctly
   * Validates: Requirements 4.4
   */
  describe('Type Filter Functionality', () => {
    it('should display "All" filter button by default', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: /^all$/i });
        expect(allButton).toBeInTheDocument();
      });
    });

    it('should filter datasets by type when type button is clicked', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      // Create datasets with type in description (JSON format)
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          id: '1', 
          title: 'Sleep Dataset',
          description: JSON.stringify({ type: 'Sleep EEG', channels: 32 })
        }),
        createMockDataset({ 
          id: '2', 
          title: 'Motor Dataset',
          description: JSON.stringify({ type: 'Motor Imagery', channels: 64 })
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Sleep Dataset')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Motor Dataset')[0]).toBeInTheDocument();
      });

      // Click on "Sleep EEG" filter button
      const sleepButton = screen.getByRole('button', { name: /sleep eeg/i });
      await user.click(sleepButton);

      await waitFor(() => {
        expect(screen.getAllByText('Sleep Dataset')[0]).toBeInTheDocument();
        expect(screen.queryByText('Motor Dataset')).not.toBeInTheDocument();
      });
    });

    it('should show all datasets when "All" filter is selected', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          id: '1', 
          title: 'Dataset 1',
          description: JSON.stringify({ type: 'Sleep EEG' })
        }),
        createMockDataset({ 
          id: '2', 
          title: 'Dataset 2',
          description: JSON.stringify({ type: 'Motor Imagery' })
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const dataset1Elements = screen.getAllByText('Dataset 1');
        expect(dataset1Elements.length).toBeGreaterThan(0);
      });

      // Click a specific type filter
      const sleepButton = screen.getByRole('button', { name: /sleep eeg/i });
      await user.click(sleepButton);

      await waitFor(() => {
        expect(screen.queryByText('Dataset 2')).not.toBeInTheDocument();
      });

      // Click "All" to show all datasets again
      const allButton = screen.getByRole('button', { name: /^all$/i });
      await user.click(allButton);

      await waitFor(() => {
        const dataset1Elements = screen.getAllByText('Dataset 1');
        const dataset2Elements = screen.getAllByText('Dataset 2');
        expect(dataset1Elements.length).toBeGreaterThan(0);
        expect(dataset2Elements.length).toBeGreaterThan(0);
      });
    });

    it('should highlight active filter button', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          description: JSON.stringify({ type: 'Sleep EEG' })
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: /^all$/i });
        expect(allButton).toHaveClass('border-primary');
      });

      // Click Sleep EEG filter
      const sleepButton = screen.getByRole('button', { name: /sleep eeg/i });
      await user.click(sleepButton);

      await waitFor(() => {
        expect(sleepButton).toHaveClass('border-primary');
      });
    });

    it('should extract dataset types from loaded datasets', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          description: JSON.stringify({ type: 'Sleep EEG' })
        }),
        createMockDataset({ 
          description: JSON.stringify({ type: 'Motor Imagery' })
        }),
        createMockDataset({ 
          description: JSON.stringify({ type: 'Cognitive' })
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sleep eeg/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /motor imagery/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cognitive/i })).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Sorting functionality
   * Validates: Requirements 4.4
   */
  describe('Sorting Functionality', () => {
    it('should display sort dropdown with options', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const sortSelect = screen.getByRole('combobox');
        expect(sortSelect).toBeInTheDocument();
      });
    });

    it('should sort datasets by price (low to high)', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: '1', title: 'Expensive', price: '10.0' }),
        createMockDataset({ id: '2', title: 'Cheap', price: '1.0' }),
        createMockDataset({ id: '3', title: 'Medium', price: '5.0' }),
      ]);

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Expensive')).toBeInTheDocument();
      });

      // Select "Price: Low" sort
      const sortSelect = screen.getByRole('combobox') as HTMLSelectElement;
      await user.selectOptions(sortSelect, 'price-low');

      await waitFor(() => {
        const cards = container.querySelectorAll('a[href^="/dataset/"]');
        const titles = Array.from(cards).map(card => 
          card.querySelector('h3')?.textContent
        );
        
        // Should be sorted: Cheap (1.0), Medium (5.0), Expensive (10.0)
        expect(titles[0]).toBe('Cheap');
        expect(titles[1]).toBe('Medium');
        expect(titles[2]).toBe('Expensive');
      });
    });

    it('should sort datasets by price (high to low)', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ id: '1', title: 'Cheap', price: '1.0' }),
        createMockDataset({ id: '2', title: 'Expensive', price: '10.0' }),
        createMockDataset({ id: '3', title: 'Medium', price: '5.0' }),
      ]);

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Expensive')).toBeInTheDocument();
      });

      // Select "Price: High" sort
      const sortSelect = screen.getByRole('combobox') as HTMLSelectElement;
      await user.selectOptions(sortSelect, 'price-high');

      await waitFor(() => {
        const cards = container.querySelectorAll('a[href^="/dataset/"]');
        const titles = Array.from(cards).map(card => 
          card.querySelector('h3')?.textContent
        );
        
        // Should be sorted: Expensive (10.0), Medium (5.0), Cheap (1.0)
        expect(titles[0]).toBe('Expensive');
        expect(titles[1]).toBe('Medium');
        expect(titles[2]).toBe('Cheap');
      });
    });

    it('should sort datasets by newest first (default)', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          id: '1', 
          title: 'Old Dataset',
          upload_date: '2024-01-01T00:00:00Z'
        }),
        createMockDataset({ 
          id: '2', 
          title: 'New Dataset',
          upload_date: '2024-03-01T00:00:00Z'
        }),
        createMockDataset({ 
          id: '3', 
          title: 'Middle Dataset',
          upload_date: '2024-02-01T00:00:00Z'
        }),
      ]);

      const { container } = render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const cards = container.querySelectorAll('a[href^="/dataset/"]');
        const titles = Array.from(cards).map(card => 
          card.querySelector('h3')?.textContent
        );
        
        // Should be sorted by newest: New, Middle, Old
        expect(titles[0]).toBe('New Dataset');
        expect(titles[1]).toBe('Middle Dataset');
        expect(titles[2]).toBe('Old Dataset');
      });
    });
  });

  /**
   * Test: Error handling
   * Validates: Requirements 4.1
   */
  describe('Error Handling', () => {
    it('should display error message when API fetch fails', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display retry button when error occurs', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockRejectedValue(new Error('Failed to load'));

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should not display loading indicator after error', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockRejectedValue(new Error('Error'));

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading datasets/i)).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Combined filters (search + type)
   * Validates: Requirements 4.4
   */
  describe('Combined Filters', () => {
    it('should apply both search and type filters together', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      const user = userEvent.setup();
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset({ 
          id: '1', 
          title: 'Sleep Study Alpha',
          description: JSON.stringify({ type: 'Sleep EEG' })
        }),
        createMockDataset({ 
          id: '2', 
          title: 'Sleep Study Beta',
          description: JSON.stringify({ type: 'Sleep EEG' })
        }),
        createMockDataset({ 
          id: '3', 
          title: 'Motor Study Alpha',
          description: JSON.stringify({ type: 'Motor Imagery' })
        }),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Sleep Study Alpha')[0]).toBeInTheDocument();
      });

      // Apply type filter
      const sleepButton = screen.getByRole('button', { name: /sleep eeg/i });
      await user.click(sleepButton);

      await waitFor(() => {
        expect(screen.getAllByText('Sleep Study Alpha')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Sleep Study Beta')[0]).toBeInTheDocument();
        expect(screen.queryByText('Motor Study Alpha')).not.toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search datasets/i);
      await user.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getAllByText('Sleep Study Alpha')[0]).toBeInTheDocument();
        expect(screen.queryByText('Sleep Study Beta')).not.toBeInTheDocument();
        expect(screen.queryByText('Motor Study Alpha')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * Test: UI elements presence
   * Validates: Requirements 4.1, 4.5
   */
  describe('UI Elements', () => {
    it('should display page header', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /datasets/i })).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      vi.mocked(fetchDatasets).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search datasets/i)).toBeInTheDocument();
      });
    });

    it('should display encrypted badge on dataset cards', async () => {
      const { fetchDatasets } = await import('@/lib/api');
      
      vi.mocked(fetchDatasets).mockResolvedValue([
        createMockDataset(),
      ]);

      render(
        <TestWrapper>
          <Marketplace />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/🔐 encrypted/i)).toBeInTheDocument();
      });
    });
  });
});
