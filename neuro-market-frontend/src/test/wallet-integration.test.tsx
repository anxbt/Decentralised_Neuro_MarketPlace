import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '../config/wagmi';
import Navbar from '../components/Navbar';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
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

describe('Wallet Integration', () => {
  it('renders RainbowKit connect button in Navbar', () => {
    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    // RainbowKit's ConnectButton should render
    const connectButton = screen.getByRole('button');
    expect(connectButton).toBeDefined();
  });

  it('displays NEUROMARKET branding', () => {
    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    expect(screen.getByText('NEUROMARKET')).toBeDefined();
  });

  it('displays navigation links', () => {
    render(
      <TestWrapper>
        <Navbar />
      </TestWrapper>
    );

    expect(screen.getByText('Marketplace')).toBeDefined();
    expect(screen.getByText('List Dataset')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
  });
});
