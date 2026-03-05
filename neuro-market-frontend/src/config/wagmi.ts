import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Suppress WalletConnect analytics errors in development
// This is just for analytics tracking, doesn't affect wallet functionality
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0]?.toString() || '';
    // Silently handle WalletConnect analytics in dev (non-critical)
    if (url.includes('pulse.walletconnect.org')) {
      return Promise.resolve(new Response('{}', { status: 200 }));
    }
    return originalFetch.apply(this, args);
  };
}

// Define Filecoin Calibration testnet
export const filecoinCalibration = defineChain({
  id: 314159,
  name: 'Filecoin Calibration',
  nativeCurrency: {
    decimals: 18,
    name: 'testnet FIL',
    symbol: 'tFIL',
  },
  rpcUrls: {
    default: {
      http: ['https://api.calibration.node.glif.io/rpc/v1'],
      webSocket: ['wss://wss.calibration.node.glif.io/apigw/lotus/rpc/v1'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Filfox',
      url: 'https://calibration.filfox.info/en',
    },
  },
  testnet: true,
});

// Configure wagmi with RainbowKit
export const config = getDefaultConfig({
  appName: 'NeuroMarket',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'local-dev-testing',
  chains: [filecoinCalibration],
  ssr: false,
});
