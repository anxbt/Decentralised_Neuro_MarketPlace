---
inclusion: always
---

# Technology Stack and Build System

## Frontend Stack

- React 18+ with TypeScript
- Vite (build tool and dev server)
- Tailwind CSS (styling)
- RainbowKit + wagmi v2 (wallet connection)
- Lit Protocol SDK (client-side encryption/decryption)
- ethers.js v6 (blockchain interactions)

## Backend Stack

- Node.js + Express (REST API)
- SQLite (metadata storage)
- TypeScript

## Smart Contracts

- Solidity ^0.8.0
- Foundry (testing and deployment)
- Filecoin FVM Calibration testnet (chainId 314159)

## External Services

- Lit Protocol DatilDev network (encryption, free tier)
- Synapse SDK (Filecoin storage with PDP proofs)
- Filecoin FVM Calibration (test network)

## Synapse SDK — Critical Facts (Read Before Writing Any Storage Code)

**Package:** `@filoz/synapse-sdk`  
**Peer dependency:** ethers v6 (must install separately — NOT ethers v5)  
**Reference dApp:** https://github.com/FIL-Builders/fs-upload-dapp

### CRITICAL: Storage is paid with USDFC, NOT tFIL

This is the biggest gotcha. Synapse uses USDFC stablecoin for storage payments.  
tFIL is only used for FVM smart contract gas and dataset purchase payments.

The user needs BOTH:
- **tFIL**: for gas + buying datasets (faucet: https://faucet.calibnet.chainsafe-fil.io)
- **USDFC**: for Synapse storage payments (faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc)

### Correct initialization pattern:

```typescript
import { Synapse } from '@filoz/synapse-sdk'
import { ethers } from 'ethers'

const provider = new ethers.BrowserProvider(window.ethereum)
const synapse = await Synapse.create({ provider })
```

### One-time setup before first upload:

```typescript
import { TOKENS, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk'

// 1. Deposit USDFC
const amount = ethers.parseUnits('10', 18) // 10 USDFC
await synapse.payments.deposit(amount, TOKENS.USDFC)

// 2. Approve Pandora service as operator
const pandoraAddress = CONTRACT_ADDRESSES.PANDORA_SERVICE[synapse.getNetwork()]
await synapse.payments.approveService(
  pandoraAddress,
  ethers.parseUnits('1', 18),    // rate allowance per epoch
  ethers.parseUnits('100', 18)   // total lockup allowance
)
```

### Upload pattern:

```typescript
const storage = await synapse.createStorage()
const result = await storage.upload(encryptedBuffer) // Buffer or Uint8Array
const pieceCid = result.pieceCid.toString() // Store this — it's your verifiable ID
```

### Download pattern:

```typescript
const downloaded = await storage.download(pieceCid)
// Returns Uint8Array — pass to Lit Protocol decryptToFile
```

### What PieceCID is (vs IPFS CID):

- **IPFS CID** (from Pinata): content hash, no proof of storage
- **PieceCID** (from Synapse): cryptographically bound to a PDP proof set
- Storage providers must submit periodic proofs they hold this PieceCID
- Judges can verify on-chain at: calibration.filfox.info
- Always store PieceCID as string in SQLite column named `piece_cid` (not `cid`)

### Never do this:

- Never use Pinata anywhere in the codebase
- Never use web3.storage or nft.storage
- Never assume tFIL pays for storage — it does not
- Never use ethers v5 with this SDK — it requires ethers v6

### Synapse SDK Payment Flow (Calibration Testnet)

Two tokens needed:

1. **tFIL** — gas for FVM transactions + dataset purchase payments  
   Faucet: https://faucet.calibnet.chainsafe-fil.io/funds.html

2. **USDFC** — Synapse storage payments only  
   Faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc

Contract addresses on Calibration (from `@filoz/synapse-sdk` CONTRACT_ADDRESSES):
- **PAYMENTS** contract: handles USDFC deposits and operator approvals
- **PANDORA_SERVICE**: the storage service operator — must be approved before upload
- **PDP_VERIFIER**: verifies proof submissions on-chain

Storage deal lifecycle:
1. User deposits USDFC to PAYMENTS contract
2. User approves PANDORA_SERVICE as operator
3. `synapse.createStorage()` creates a storage session
4. `storage.upload(buffer)` sends file to storage provider
5. Provider registers a PDP proof set on-chain (PDP_VERIFIER)
6. Provider submits proofs every ~30min to prove possession
7. PAYMENTS releases USDFC to provider only after proof confirmed

For NeuroMarket demo: steps 1-2 happen once at wallet setup.  
Steps 3-6 happen on every dataset upload.  
Step 7 is automatic — judges can verify live proof status on block explorer.

### Reference Implementation

Full working example with RainbowKit + wagmi + Synapse:  
https://github.com/FIL-Builders/fs-upload-dapp

Key files to study before implementing:
- `hooks/usePayment.ts` — USDFC deposit + approval flow
- `hooks/useFileUpload.ts` — actual upload with status tracking
- `hooks/useBalances.ts` — checking tFIL/USDFC/storage balances

## Critical: Web3 SDK Research Required

Web3 libraries break frequently. ALWAYS search for latest docs before coding:

- Lit Protocol: https://developer.litprotocol.com (check DatilDev config)
- RainbowKit: https://www.rainbowkit.com/docs (v2 has breaking changes)
- wagmi: https://wagmi.sh (v2 completely different from v1)
- Synapse SDK: https://github.com/FIL-Builders/fs-upload-dapp (reference implementation)
- ethers.js v6: breaking changes from v5 (no BigNumber, providers changed)

Never assume you know the API. Verify against current documentation.

**You are encouraged to search the web freely** for additional documentation, examples, tutorials, GitHub issues, Stack Overflow discussions, and any other resources beyond the links provided above. The documentation landscape changes rapidly - use all available resources to find the most current and accurate information.

## Package Manager

**Use pnpm for all package management.** Do not use npm or yarn.

## Common Commands

### Frontend Development
```bash
cd frontend
pnpm install
pnpm dev             # Start Vite dev server
pnpm build           # Production build
pnpm preview         # Preview production build
pnpm lint            # Run ESLint
pnpm type-check      # TypeScript type checking
```

### Backend Development
```bash
cd backend
pnpm install
pnpm dev             # Start Express server with hot reload
pnpm build           # Compile TypeScript
pnpm start           # Run production server
pnpm test            # Run Jest tests
```

### Smart Contract Development
```bash
cd contracts
forge install        # Install dependencies
forge build          # Compile contracts
forge test           # Run tests
forge test --match-test testName  # Run specific test
forge script scripts/Deploy.s.sol --rpc-url $RPC_URL --broadcast  # Deploy
```

## Architecture Decisions (Do Not Change)

- Encryption: Lit Protocol DatilDev ONLY (free, no capacity credits)
- Network: LIT_NETWORK.DatilDev (NOT Datil, NOT DatilTest - those require payment)
- Storage: Synapse SDK with USDFC payments (NOT Pinata, NOT web3.storage)
- Chain: Filecoin FVM Calibration (chainId 314159, NOT mainnet)
- Contract pattern: Checks-Effects-Interactions strictly enforced
- File size: max 200 MiB uploads (Synapse limit)
- Storage identifier: PieceCID (NOT IPFS CID)

## Security Rules

- Never store private keys in code or committed .env files
- Contract must validate msg.value == dataset.price before state changes
- Lit access condition must verify hasAccess(datasetId, userAddress) on FVM contract
- Never trust frontend-sent metadata - validate on backend before DB insert

## Backend Responsibilities

Backend is metadata index ONLY:
- Stores PieceCID, price, researcher address, purchase count
- Smart contract is source of truth for ownership
- Backend mirrors contract state, never overrides it

Backend does NOT:
- Encrypt files (frontend does via Lit SDK)
- Call Synapse SDK directly (frontend does)
- Handle payments (smart contract does for purchases, Synapse SDK does for storage)

## Testing Strategy

- Frontend: Vitest + React Testing Library + fast-check (property tests)
- Backend: Jest + fast-check (property tests)
- Contracts: Foundry + Echidna (property tests)
- Minimum 100 iterations per property test
- Tag format: `Feature: neuromarket, Property {N}: {description}`
