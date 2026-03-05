---
inclusion: always
---

# NeuroMarket Product Overview

NeuroMarket is a decentralized marketplace for EEG (electroencephalography) datasets built on Filecoin FVM Calibration testnet. The platform enables neuroscience researchers to monetize their neural data while maintaining privacy and control through client-side encryption.

## Core Value Proposition

Researchers encrypt and sell EEG datasets. Buyers purchase access using tFIL cryptocurrency. Access control is enforced on-chain, with decryption only possible for verified owners.

## Key Features

- Wallet-based authentication (no passwords or accounts)
- Client-side file encryption before upload (Lit Protocol)
- Decentralized storage on Filecoin with PDP proofs (Synapse SDK)
- Smart contract-enforced access control and payments
- Automatic fund transfer from buyer to researcher
- Secure decrypt-and-download for purchased datasets
- Verifiable storage proofs visible on-chain

## User Roles

- Researchers: Upload encrypted datasets, set prices, receive payments
- Buyers: Browse marketplace, purchase datasets with tFIL, decrypt and download owned files

## Technology Stack

- Blockchain: Filecoin FVM Calibration testnet (chainId 314159)
- Encryption: Lit Protocol DatilDev network (free tier)
- Storage: Synapse SDK with PDP proofs (USDFC payments)
- Payments: tFIL (test Filecoin tokens for purchases), USDFC (for storage)

## Demo Priority

If time-constrained, implement in this order:
1. Wallet connect (RainbowKit)
2. Lit encrypt + Synapse upload with PDP proofs
3. Smart contract deploy + purchase function + hasAccess view
4. Buy flow end-to-end
5. Dashboard page with PDP proof verification
6. Polish
