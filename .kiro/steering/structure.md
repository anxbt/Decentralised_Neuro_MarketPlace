---
inclusion: always
---

# Project Structure and Organization

## Repository Layout

```
neuromarket/
├── frontend/           # React + Vite frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   ├── Marketplace.tsx
│   │   │   ├── DatasetDetail.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── lib/           # Utility libraries
│   │   │   ├── lit.ts         # Lit Protocol integration
│   │   │   ├── synapseStorage.ts  # Synapse SDK for Filecoin storage
│   │   │   ├── contract.ts    # Smart contract interactions
│   │   │   └── api.ts         # Backend API client
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useWallet.ts
│   │   │   ├── useDatasets.ts
│   │   │   └── useContract.ts
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── public/            # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/            # Node.js + Express API server
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   │   └── datasets.ts
│   │   ├── models/        # Database models
│   │   │   └── dataset.ts
│   │   ├── db/            # Database setup
│   │   │   └── sqlite.ts
│   │   ├── middleware/    # Express middleware
│   │   │   └── validation.ts
│   │   └── server.ts      # Express app setup
│   ├── package.json
│   └── tsconfig.json
│
├── contracts/          # Solidity smart contracts
│   ├── src/
│   │   └── NeuroMarketplace.sol
│   ├── test/
│   │   └── NeuroMarketplace.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   ├── foundry.toml
│   └── .env.example
│
└── .kiro/              # Kiro configuration
    ├── specs/          # Project specifications
    │   └── neuromarket/
    │       ├── requirements.md
    │       ├── design.md
    │       └── tasks.md
    └── steering/       # AI assistant guidance
        ├── product.md
        ├── tech.md
        └── structure.md
```

## Component Organization

### Frontend Components

Components follow a feature-based organization:

- **WalletConnect**: RainbowKit integration, wallet state management
- **UploadForm**: File selection, encryption, Synapse upload, contract registration
- **Marketplace**: Dataset listing, search/filter, navigation to details
- **DatasetDetail**: Single dataset view, purchase flow, download button
- **Dashboard**: Researcher's uploaded datasets, sales tracking

### Frontend Libraries (lib/)

Encapsulate external service integrations:

- **lit.ts**: Lit Protocol encryption/decryption, access control conditions
- **synapseStorage.ts**: Synapse SDK for Filecoin storage with PDP proofs
- **contract.ts**: Smart contract ABI, read/write functions, event listeners
- **api.ts**: Backend REST API client with typed responses

### Backend Routes

RESTful API endpoints:

- `POST /api/datasets` - Store dataset metadata
- `GET /api/datasets` - List all datasets
- `GET /api/datasets/:id` - Get dataset details
- `GET /api/datasets/researcher/:address` - Filter by researcher

### Smart Contracts

Single contract deployment:

- **NeuroMarketplace.sol**: Dataset registration, purchase flow, access control
- Follows Checks-Effects-Interactions pattern
- Emits events for all state changes

## Data Flow Architecture

### Upload Flow
1. Frontend: User selects file in UploadForm
2. Frontend: Lit Protocol encrypts file (browser-side)
3. Frontend: Synapse SDK uploads encrypted file to Filecoin storage, returns PieceCID
4. Frontend: Smart contract registers dataset with PieceCID
5. Frontend: Backend API stores metadata + txHash
6. Frontend: UI updates to show success with PDP proof status

### Purchase Flow
1. Frontend: User clicks purchase on DatasetDetail
2. Frontend: Smart contract purchaseDataset() with payment
3. Contract: Validates payment, grants access, transfers tFIL
4. Frontend: UI enables download button
5. Backend: (Optional) Update purchase count via event listener

### Download Flow
1. Frontend: User clicks download
2. Frontend: Smart contract verifies hasAccess()
3. Frontend: Synapse SDK fetches encrypted file using PieceCID
4. Frontend: Lit Protocol decrypts (verifies on-chain access)
5. Frontend: Browser downloads decrypted file

## State Management

### Frontend State
- Wallet state: RainbowKit + wagmi hooks
- Dataset state: React Query or SWR for API caching
- Upload state: Local component state with progress tracking
- Purchase state: Local component state with transaction status

### Backend State
- SQLite database: Metadata persistence
- No session state (stateless API)
- Smart contract is source of truth for ownership

### Smart Contract State
- `mapping(string => Dataset) datasets` - Dataset registry
- `mapping(string => mapping(address => bool)) accessControl` - Ownership records

## File Naming Conventions

- React components: PascalCase (e.g., `DatasetDetail.tsx`)
- Utility files: camelCase (e.g., `lit.ts`, `synapseStorage.ts`)
- Test files: Match source file with `.test.ts` or `.t.sol` suffix
- Config files: kebab-case (e.g., `vite.config.ts`)

## Environment Variables

### Frontend (.env)
```
VITE_CONTRACT_ADDRESS=0x...
VITE_BACKEND_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
DATABASE_PATH=./data/neuromarket.db
```

### Contracts (.env)
```
PRIVATE_KEY=your_private_key
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

## Key Architectural Patterns

- **Client-side encryption**: Files never leave browser unencrypted
- **On-chain access control**: Smart contract is single source of truth
- **Backend as index**: Metadata mirror for fast queries, not authoritative
- **Separation of concerns**: Frontend handles crypto, backend handles metadata, contract handles payments
- **Event-driven updates**: Smart contract events trigger UI and backend updates

## Development Workflow

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Deploy contracts: `cd contracts && forge script script/Deploy.s.sol`
4. Update frontend with contract address
5. Test end-to-end flow in browser

## Testing Organization

- Unit tests alongside source files
- Integration tests in dedicated `__tests__` directories
- Property tests tagged with `Feature: neuromarket, Property {N}`
- Contract tests in `contracts/test/`
