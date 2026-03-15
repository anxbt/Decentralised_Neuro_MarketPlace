# NeuroMarket

> **The first trustless marketplace for encrypted brain data.**  
> Researchers upload EEG datasets. Buyers pay with crypto. Only the buyer can decrypt. Storage is cryptographically verified on Filecoin. No admin. No middleman. No trust required.

[![Contract](https://img.shields.io/badge/Contract-Filecoin%20Calibration-green?style=for-the-badge)](https://calibration.filfox.info/en/address/0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b)
[![License](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue?style=for-the-badge)](LICENSE)
[![Track](https://img.shields.io/badge/Track-Neurotechnology%20%26%20BCI-purple?style=for-the-badge)]()

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Demo](#live-demo)
- [Key Innovation](#key-innovation)
- [Architecture](#architecture)
- [Sponsor Bounty Integrations](#sponsor-bounty-integrations)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Smart Contract](#smart-contract)
- [Roadmap](#roadmap)
- [Why Filecoin?](#why-filecoin)
- [Team](#team)
- [License](#license)

---

## The Problem

EEG datasets cost **$500–$5,000 per subject** to collect. Neuroscience researchers spend years gathering this data, then lock it in institutional servers — or give it away for free on platforms that take no responsibility for storage permanence. There is no mechanism for a researcher to:

- **Monetize** their dataset directly
- **Guarantee** it will still exist in 5 years
- **Control** who can access it without running a server

Buyers — other researchers, BCI companies, AI labs — have no way to verify the data exists before purchasing, and no cryptographic guarantee they're the only ones who can read it.

---

## The Solution

NeuroMarket connects three technologies into a single closed loop:

```
Researcher uploads → Lit Protocol encrypts client-side
                   → Synapse SDK stores on Filecoin with PDP proof
                   → FVM smart contract registers dataset + price

Buyer purchases    → tFIL sent to smart contract (non-custodial)
                   → Lit nodes call hasAccess() on FVM contract
                   → Decryption key reconstructed ONLY if blockchain confirms payment
                   → Buyer downloads and decrypts their EEG file
```

**The blockchain contract IS the encryption key manager.** No server can be bribed. No admin can leak data. No CDN can go down and lose your dataset.

---

## Live Demo

| Resource | Link |
|---|---|
| Smart Contract | [`0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b`](https://calibration.filfox.info/en/address/0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b) on Filecoin Calibration |
| Contract Explorer | [View on Filfox](https://calibration.filfox.info/en/address/0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b) |
| Demo Video | _Coming soon_ |
| Verify a Dataset | Run locally → `http://localhost:5173/verify?datasetId=YOUR_DATASET_ID` |

> **Try it yourself:** Clone the repo, run the frontend + backend locally (see [Getting Started](#getting-started)), connect a wallet on Filecoin Calibration testnet, and use the [faucet](https://faucet.calibration.fildev.network) to get tFIL. Browse the marketplace, upload a dataset, or verify on-chain integrity at `/verify`.

---

## Key Innovation

### 1. On-Chain Access Control Gates Decryption

Lit Protocol's v8 SDK (Naga network) holds encrypted key shares via threshold cryptography. It only reconstructs the decryption key when its access condition evaluates to `true`. Our access condition calls `hasAccess(datasetId, buyerAddress)` directly on our FVM smart contract.

```javascript
// Lit Protocol access condition — this is what makes it trustless
const accessControlConditions = [{
  contractAddress: NEUROMARKET_CONTRACT,
  standardContractType: "Custom",
  chain: "filecoinCalibration",
  method: "hasAccess",
  parameters: [":datasetId", ":userAddress"],
  returnValueTest: { comparator: "=", value: "true" }
}];
```

Decryption is **physically impossible** without on-chain confirmation of payment. There is no admin override. The contract enforces access.

### 2. Verifiable Storage via Synapse SDK + PDP

We use Filecoin's **Proof of Data Possession (PDP)** protocol via the Synapse SDK — not a pinning service, not a gateway. Storage providers must cryptographically prove they hold the data periodically. The PieceCID is verifiable on-chain.

```typescript
// Upload returns a PieceCID bound to PDP proof set
const storage = await synapse.storage.create({ proofSet });
const { pieceCid } = await storage.upload(encryptedBuffer);
// Anyone can verify: calibration.filscan.io/en/deal?cid=pieceCid
```

This is fundamentally different from Pinata or IPFS pinning. Storage providers **lose staked collateral** if they fail to produce proofs.

### 3. Non-Custodial Researcher Payments

```solidity
function purchaseDataset(string memory datasetId) external payable {
    Dataset storage dataset = datasets[datasetId];
    require(dataset.exists, "Dataset does not exist");
    require(msg.value == dataset.price, "Incorrect payment amount");
    require(!accessControl[datasetId][msg.sender], "Already purchased");
    
    // CEI Pattern: state updated BEFORE transfer
    accessControl[datasetId][msg.sender] = true;
    
    // Direct transfer to researcher — contract never holds funds
    (bool success, ) = dataset.researcher.call{value: msg.value}("");
    require(success, "Payment transfer failed");
    
    emit DatasetPurchased(datasetId, msg.sender, dataset.researcher, msg.value);
}
```

Payment goes directly from buyer wallet to researcher wallet. NeuroMarket never holds or touches the funds.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  RainbowKit + wagmi v2 · Filecoin Calibration Chain      │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
           ▼                              ▼
┌──────────────────┐           ┌──────────────────────────┐
│  Lit Protocol    │           │   Synapse SDK             │
│  NagaDev (v8)    │           │   (@filoz/synapse-sdk)    │
│                  │           │                            │
│  · encryptFile() │           │  · PDP proof set creation │
│  · hasAccess()   │           │  · Encrypted file upload  │
│    calls FVM     │           │  · Returns PieceCID        │
│  · decryptToFile │           │  · USDFC payment to SPs   │
└──────────┬───────┘           └────────────┬─────────────┘
           │                                │
           └──────────────┬─────────────────┘
                          ▼
           ┌──────────────────────────────┐
           │   FVM Smart Contract          │
           │   Filecoin Calibration        │
           │                               │
           │   registerDataset(id,cid,     │
           │     price,contentHash)         │
           │   purchaseDataset() payable   │
           │   hasAccess() → bool          │
           │   getDataset() → (cid,owner,  │
           │     price,contentHash)         │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │   Backend (Node + Express)    │
           │   SQLite metadata index only  │
           │   (not source of truth)       │
           └──────────────────────────────┘
```

---

## Sponsor Bounty Integrations

### Filecoin + FVM
- Smart contract deployed on Filecoin Calibration testnet
- Dataset purchases paid in tFIL via FVM transactions
- PieceCIDs stored and verified on-chain
- All access control state lives on FVM — no centralized backend controls access

**Code reference:** [`contracts/src/NeuroMarketplace.sol`](contracts/src/NeuroMarketplace.sol)

### Synapse SDK (Filecoin Onchain Cloud)
- All encrypted datasets stored via Synapse SDK with PDP proofs
- Storage paid in USDFC (Filecoin stablecoin)
- PieceCID returned and registered on-chain
- Public verification page at `/verify/[pieceCid]` shows live proof status

**Code reference:** [`neuro-market-frontend/src/lib/synapseStorage.ts`](neuro-market-frontend/src/lib/synapseStorage.ts)

### Lit Protocol
- Client-side encryption via Lit Protocol v8 SDK on `NagaDev` network
- Access conditions call `hasAccess()` on FVM contract
- Threshold decryption: key reconstructed only when on-chain state confirms access
- No fallback — encryption either works via Lit or upload is blocked entirely

**Code reference:** [`neuro-market-frontend/src/lib/lit.ts`](neuro-market-frontend/src/lib/lit.ts)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Wallet | RainbowKit + wagmi v2 |
| Blockchain | Filecoin FVM Calibration (Chain ID: 314159) |
| Smart Contract | Solidity ^0.8.0 (Checks-Effects-Interactions) |
| Storage | Synapse SDK — `@filoz/synapse-sdk` |
| Encryption | Lit Protocol v8 — `@lit-protocol/lit-client` (NagaDev) |
| Backend | Node.js + Express + SQLite (metadata index) |
| Build Tools | pnpm monorepo + Foundry (contract) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A wallet with Filecoin Calibration tFIL ([faucet](https://faucet.calibration.fildev.network))
- USDFC for Synapse storage payments ([USDFC faucet](https://faucet.calibration.fildev.network))

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/neuromarket
cd neuromarket
pnpm install
```

### Environment Variables

```bash
cp neuro-market-frontend/.env.example neuro-market-frontend/.env
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env
```

**Frontend** (`neuro-market-frontend/.env`):
```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id   # from cloud.walletconnect.com
VITE_PINATA_JWT=your_pinata_jwt
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
VITE_CONTRACT_ADDRESS=0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b
VITE_BACKEND_URL=http://localhost:3001
```

**Contracts** (`contracts/.env`):
```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
```

### Run Locally

```bash
# Start backend (terminal 1)
cd backend && pnpm install && pnpm dev

# Start frontend (terminal 2)
cd neuro-market-frontend && pnpm install && pnpm dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

### Deploy Contract

```bash
cd contracts

# Build
forge build

# Test (31 tests)
forge test

# Deploy to Filecoin Calibration
# NOTE: Filecoin requires high gas limit (~300M) for contract creation
source .env
forge create src/NeuroMarketplace.sol:NeuroMarketplace \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --legacy \
  --gas-limit 300000000 \
  --broadcast --retries 15 --timeout 600
```

### One-Time Synapse Setup

Before uploading datasets, approve USDFC allowance for storage payments:

```typescript
import { Synapse, TOKENS } from "@filoz/synapse-sdk";

const synapse = await Synapse.create({ signer });
const amount = ethers.parseUnits("10", 18);
await synapse.payments.deposit(amount, TOKENS.USDFC);
// Copy the Pandora service address from Synapse SDK docs
await synapse.payments.approveService(pandoraAddress, rateAllowance, lockupAllowance);
```

---

## Smart Contract

**Deployed:** [`0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b`](https://calibration.filfox.info/en/address/0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b) on Filecoin Calibration

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NeuroMarketplace {
    struct Dataset {
        string cid;           // PieceCID from Synapse SDK
        address researcher;   // Receives payment directly
        uint256 price;        // In wei (tFIL)
        bytes32 contentHash;  // SHA-256 of plaintext file (for buyer verification)
        bool exists;
    }

    mapping(string => Dataset) public datasets;           // datasetId → Dataset
    mapping(string => mapping(address => bool)) public accessControl;

    event DatasetRegistered(string indexed datasetId, string cid, address indexed researcher, uint256 price, bytes32 contentHash);
    event DatasetPurchased(string indexed datasetId, address indexed buyer, address indexed researcher, uint256 price);

    function registerDataset(string memory datasetId, string memory cid, uint256 price, bytes32 contentHash) external { ... }
    function purchaseDataset(string memory datasetId) external payable { ... }  // CEI pattern
    function hasAccess(string memory datasetId, address buyer) external view returns (bool) { ... }
    function getDataset(string memory datasetId) external view returns (string memory cid, address researcher, uint256 price, bytes32 contentHash) { ... }
}
```

- `hasAccess()` is called by Lit Protocol nodes to determine whether to release decryption key shares — bridging encryption and on-chain payment.
- `contentHash` stores the SHA-256 of the plaintext file. Buyers can verify data integrity post-download at `/verify`.
- `getDataset()` exposes dataset info including the content hash for public verification.

---

## Roadmap

NeuroMarket is designed to evolve beyond a marketplace into a protocol:

**Phase 1 — Hackathon (Current)**
- [x] Encrypted upload via Lit Protocol + Synapse SDK
- [x] FVM smart contract with access control
- [x] Non-custodial tFIL payments
- [x] Public PDP proof verification page
- [x] Working frontend on Filecoin Calibration testnet

**Phase 2 — Post-Hackathon (Grant Milestone 1)**
- [ ] DataDAO treasury: % of each sale funds perpetual storage renewal
- [ ] DAO membership NFT for dataset buyers
- [x] ~~On-chain dataset file hash verification~~ → **Shipped in v2** (`contentHash` in contract + `/verify` page)

**Phase 3 — Open Grant**
- [ ] Perpetual Storage Actor: auto-renews storage deals before expiry
- [ ] Compute-over-data: run ML models on encrypted EEG without downloading
- [ ] Geographic storage constraints: EU-only providers for GDPR compliance
- [ ] Integration with PhysioNet and DANDI (neuroscience data archives)

---

## Why Filecoin?

This project cannot be replicated on AWS S3 + Ethereum. Here's why:

**PDP Proofs** — Storage providers cryptographically prove they hold your data periodically and lose staked collateral if they fail. No centralized storage service offers this guarantee.

**FVM programmability** — The `hasAccess()` function runs on-chain. Lit Protocol can call it trustlessly. This is impossible on centralized infrastructure without introducing a trusted intermediary.

**Permanent storage economics** — The Filecoin storage market lets us build DataDAO mechanics where dataset purchases fund perpetual storage renewal. No S3 bucket has programmable, community-controlled renewal.

---

## Team

**Rishav** — Solo developer. Student + independent builder in the Web3/DeFi space.

---

## License

Dual licensed under MIT OR Apache-2.0. See [LICENSE](LICENSE), [LICENSE-MIT](LICENSE-MIT), and [LICENSE-APACHE](LICENSE-APACHE).

---

*Built for PL Genesis: Frontiers of Collaboration · BCI / Neurotechnology Track · Fresh Code*