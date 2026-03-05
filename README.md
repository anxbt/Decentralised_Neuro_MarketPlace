# NeuroMarket

Decentralized EEG dataset marketplace built on Filecoin FVM Calibration testnet.

## Overview

NeuroMarket enables neuroscience researchers to encrypt and sell EEG datasets while maintaining privacy and control. Buyers can purchase access using tFIL cryptocurrency, with access control enforced on-chain and decryption only possible for verified owners.

## Technology Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Smart Contracts**: Solidity + Foundry
- **Blockchain**: Filecoin FVM Calibration testnet (chainId 314159)
- **Encryption**: Lit Protocol DatilDev network (free tier)
- **Storage**: Pinata IPFS (JWT authentication)

## Project Structure

```
neuromarket/
├── frontend/          # React frontend application
├── backend/           # Express API server
├── contracts/         # Solidity smart contracts
└── .kiro/            # Project specifications
```

## Prerequisites

- Node.js 18+ and pnpm
- Foundry (for smart contract development)
- Filecoin FVM Calibration testnet wallet with tFIL
- Pinata account with JWT token

## Setup

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### 2. Configure Environment Variables

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Pinata JWT, contract address, and backend URL
```

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database path and port
```

**Contracts** (`contracts/.env`):
```bash
cp contracts/.env.example contracts/.env
# Edit contracts/.env with your private key and RPC URL
```

### 3. Deploy Smart Contract

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url calibration --broadcast
# Save the deployed contract address
```

### 4. Start Development Servers

**Backend**:
```bash
pnpm dev:backend
# Runs on http://localhost:3001
```

**Frontend**:
```bash
pnpm dev:frontend
# Runs on http://localhost:5173
```

## Development Commands

### Frontend
```bash
cd frontend
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking
pnpm test             # Run tests
```

### Backend
```bash
cd backend
pnpm dev              # Start dev server with hot reload
pnpm build            # Compile TypeScript
pnpm start            # Run production server
pnpm test             # Run tests
```

### Smart Contracts
```bash
cd contracts
forge build           # Compile contracts
forge test            # Run tests
forge test --match-test testName  # Run specific test
forge script script/Deploy.s.sol --rpc-url calibration --broadcast  # Deploy
```

## Testing

The project uses a dual testing approach:
- **Unit tests**: Specific examples and edge cases
- **Property-based tests**: Universal properties with fast-check/Echidna

Run all tests:
```bash
pnpm test:frontend
pnpm test:backend
cd contracts && forge test
```

## Key Features

- Wallet-based authentication (RainbowKit)
- Client-side file encryption (Lit Protocol)
- Decentralized storage (Pinata IPFS)
- Smart contract-enforced access control
- Automatic fund transfer from buyer to researcher
- Secure decrypt-and-download for purchased datasets

## Architecture

### Upload Flow
1. User selects file in UploadForm
2. Lit Protocol encrypts file (browser-side)
3. Pinata pins encrypted blob, returns CID
4. Smart contract registers dataset with CID
5. Backend API stores metadata + txHash
6. UI updates to show success

### Purchase Flow
1. User clicks purchase on DatasetDetail
2. Smart contract purchaseDataset() with payment
3. Contract validates payment, grants access, transfers tFIL
4. UI enables download button

### Download Flow
1. User clicks download
2. Smart contract verifies hasAccess()
3. Pinata fetches encrypted file via CID
4. Lit Protocol decrypts (verifies on-chain access)
5. Browser downloads decrypted file

## Resources

- [Filecoin FVM Calibration Faucet](https://faucet.calibration.fildev.network/)
- [Lit Protocol Documentation](https://developer.litprotocol.com)
- [Pinata Documentation](https://docs.pinata.cloud)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)

## License

MIT
