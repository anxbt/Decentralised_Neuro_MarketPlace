# NeuroMarket — Deployment & Upload Log

> **Documented**: March 9, 2026  
> **Network**: Filecoin FVM Calibration Testnet (chainId `314159`)

---

## 1. Smart Contract Deployment

| Field               | Value                                                                 |
|---------------------|-----------------------------------------------------------------------|
| **Contract**        | `NeuroMarketplace.sol`                                                |
| **Address**         | `0x8F61BF10258AB489d841B5dEdB49A98f738Cc430`                          |
| **Deployer**        | `0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853`                          |
| **Network**         | Filecoin FVM Calibration (chainId `314159`)                           |
| **Deploy Tx**       | `0xa52ac6107448763568e0a917b2be4f52d6a863518b8dbd7771c0fcf3e5225017`   |
| **Deploy Date**     | February 25, 2026                                                     |
| **Block Explorer**  | https://calibration.filfox.info/en/address/0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 |
| **Deploy Script**   | `contracts/script/Deploy.s.sol`                                       |
| **Deploy Command**  | `forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --legacy` |

---

## 2. Successful End-to-End Upload Flow

The following console log captures a **fully successful** dataset upload — encryption, Filecoin storage via Synapse, on-chain registration, and backend metadata indexing.

### 2.1 Upload Console Output (March 9, 2026)

```
[Synapse] Upload complete! PieceCID: bafkzcibe4stw6en5sivckhpqn2wbjsbvfhc6ai7tutapheyxrkzzp5xxccvot3qkaq

[Upload] Uploaded to Filecoin. PieceCID: bafkzcibe4stw6en5sivckhpqn2wbjsbvfhc6ai7tutapheyxrkzzp5xxccvot3qkaq

[Upload] Step 3: Registering on Filecoin FVM...
[Upload] Transaction submitted. Hash: 0x3a863a090200dcc7344bcfcc6440debdb0db21d24822e347f1967a292c50d1d5
[Upload] Transaction confirmed!

[Upload] Step 4: Storing metadata in backend...
[API] POST http://localhost:3001/api/datasets {data: {…}}
[API] POST http://localhost:3001/api/datasets -> 201
  {
    id: 'dataset-1773069746086-o260y',
    title: 'sa',
    description: 'No description provided',
    price: '2',
    cid: 'bafkzcibe4stw6en5sivckhpqn2wbjsbvfhc6ai7tutapheyxrkzzp5xxccvot3qkaq',
    researcher_address: '0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853',
    tx_hash: '0x3a863a090200dcc7344bcfcc6440debdb0db21d24822e347f1967a292c50d1d5'
  }

[Upload] Metadata stored in backend
```

### 2.2 Step-by-Step Breakdown

| Step | Action                        | Status | Details                                                                 |
|------|-------------------------------|--------|-------------------------------------------------------------------------|
| 1    | **Encrypt dataset**           | ✅ OK  | File encrypted client-side before upload                                |
| 2    | **Upload to Filecoin (Synapse)** | ✅ OK  | PieceCID `bafkzcibe4stw6en5sivckhpqn2wbjsbvfhc6ai7tutapheyxrkzzp5xxccvot3qkaq` |
| 3    | **Register on FVM**           | ✅ OK  | Tx `0x3a863a...d1d5` confirmed on Calibration testnet                   |
| 4    | **Store metadata in backend** | ✅ OK  | HTTP 201 — dataset `dataset-1773069746086-o260y` created                |

### 2.3 PDP Proof Status

```
calib.ezpdpz.net/pdp/piece?pieceCid=bafkzcibe4stw6en5sivckhpqn2wbjsbvfhc6ai7tutapheyxrkzzp5xxccvot3qkaq:1
→ 404 (expected — PDP proof takes time to propagate on Calibration testnet)
```

> **Note**: The 404 on the PDP endpoint is **non-critical**. Proof of Data Possession proofs propagate asynchronously after upload and may take minutes-to-hours to become available. The `PDPProofBadge` component polls this endpoint and will display a verified badge once the proof is published.

---

## 3. Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)              │
│  http://localhost:5173                                      │
│                                                             │
│  Upload Flow:                                               │
│    1. Encrypt file (client-side)                            │
│    2. Upload to Filecoin via Synapse SDK → PieceCID         │
│    3. Register on FVM smart contract (tFIL transaction)     │
│    4. POST metadata to backend API                          │
│                                                             │
│  Purchase Flow:                                             │
│    1. Call purchaseDataset() on FVM contract (tFIL payment) │
│    2. POST purchase record to backend                       │
│    3. Decrypt file using Lit Protocol access control         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        Backend (Express + SQLite)            │
│  http://localhost:3001                                      │
│  Endpoints:                                                 │
│    GET  /api/health           → Health check                │
│    GET  /api/datasets         → List all datasets           │
│    GET  /api/datasets/:id     → Get dataset by ID           │
│    POST /api/datasets         → Store new dataset metadata  │
│    GET  /api/purchases        → List purchases              │
│    POST /api/purchases        → Record new purchase         │
├─────────────────────────────────────────────────────────────┤
│                   Smart Contract (Solidity)                  │
│  NeuroMarketplace.sol                                       │
│  Filecoin Calibration: 0x8F61BF1...Cc430                    │
│  Functions: listDataset, purchaseDataset, hasAccess          │
├─────────────────────────────────────────────────────────────┤
│                        Storage                              │
│  Filecoin (via Synapse SDK) — encrypted dataset files       │
│  SQLite (backend) — dataset metadata & purchase records     │
│  Lit Protocol (DatilDev) — access control & decryption      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Environment & Tooling

| Tool / Service         | Version / Network       | Purpose                          |
|------------------------|-------------------------|----------------------------------|
| Solidity               | ^0.8.20                 | Smart contract language           |
| Foundry (Forge)        | Latest                  | Contract compilation & deployment |
| Filecoin Calibration   | chainId 314159          | Testnet blockchain                |
| Synapse SDK            | @filoz/synapse-sdk      | Filecoin storage uploads          |
| Lit Protocol           | DatilDev (free tier)    | Client-side encryption / access   |
| React 18 + Vite        | TypeScript              | Frontend application              |
| Express.js             | ^4.18                   | Backend API server                |
| SQLite (better-sqlite3)| ^11.0                   | Metadata database                 |
| WalletConnect          | wagmi + viem            | Wallet integration                |

---

## 5. Key Addresses & Links

- **Contract**: [`0x8F61BF10258AB489d841B5dEdB49A98f738Cc430`](https://calibration.filfox.info/en/address/0x8F61BF10258AB489d841B5dEdB49A98f738Cc430)
- **Deployer**: `0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853`
- **Faucet**: https://faucet.calibration.fildev.network/
- **Block Explorer**: https://calibration.filfox.info/
- **PDP Verifier**: `https://calib.ezpdpz.net/pdp/piece?pieceCid=<CID>`

---

*This document was generated to serve as a reference for team members evaluating the project's deployment and end-to-end data flow.*
