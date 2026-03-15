# Grant Proposal: NeuroMarket - Trustless Encrypted Brain Data Marketplace on FVM

**Project Name:** NeuroMarket

**Proposal Category:** Storage

**Individual or Entity Name:** Individual

**Proposer:** anxbt

**Project Repo(s):** https://github.com/anxbt/Decentralised_Neuro_MarketPlace

**Filecoin ecosystem affiliations:** None. No existing work relationships with Protocol Labs, Filecoin Foundation, or any organization in the Protocol Labs Network.

**(Optional) Technical Sponsor:** N/A

**Do you agree to open source all work you do on behalf of this RFP under the MIT/Apache-2 dual-license?:** Yes

---

### 1. What is your project and what problem does it solve? (max 100 words)

NeuroMarket is a trustless marketplace for encrypted EEG and neuroscience datasets on Filecoin FVM. Researchers upload encrypted datasets to Filecoin through Synapse SDK with PDP-backed storage proofs, and buyers purchase access in tFIL. Decryption is gated by an on-chain access check: Lit Protocol nodes call the marketplace contract's `hasAccess(datasetId, buyer)` before releasing decryption capability. This solves two problems: researchers currently have weak monetization paths for expensive-to-collect brain data, and buyers lack cryptographic guarantees that data access is payment-gated and storage is verifiable.

**Contract:** `0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b` (Filecoin Calibration testnet)

**Hackathon submission:** PL Genesis: Frontiers of Collaboration - BCI / Neurotechnology Track

---

### 2. How is Filecoin used in this project?

NeuroMarket uses Filecoin at three layers:

**FVM Smart Contract (Access and Payment Layer)**

The marketplace contract is deployed on Filecoin Calibration and handles dataset registration, tFIL payment settlement, and access state. The key function used by Lit access conditions is:

```solidity
function hasAccess(string memory datasetId, address buyer) external view returns (bool) {
    return accessControl[datasetId][buyer];
}
```

Lit Protocol evaluates this function via RPC before allowing decryption of key material.

**Synapse SDK + PDP (Storage Layer)**

All encrypted dataset payloads are stored via `@filoz/synapse-sdk`, returning PieceCIDs. Storage is tied to Proof of Data Possession (PDP) so providers must continue proving they hold data.

**On-chain activity and verifiability (Network Growth Layer)**

Each dataset registration and purchase is an FVM transaction. Metadata critical to integrity and access (`cid`, `price`, `researcher`, `contentHash`) is anchored on-chain. The current architecture treats backend SQLite as a convenience index, not the cryptographic source of truth.

**APIs and tools used:**
- `@filoz/synapse-sdk` - PDP-backed storage and PieceCID retrieval
- `@lit-protocol/lit-client` + `@lit-protocol/auth` - threshold encryption/decryption with on-chain access control
- `wagmi` + `RainbowKit` - wallet integration for Filecoin Calibration (Chain ID 314159)
- Foundry - contract testing and deployment
- Glif Calibration RPC - `https://api.calibration.node.glif.io/rpc/v1`

---

### 3. How will you improve your project with this grant?

Current state: Working prototype on Filecoin Calibration with encrypted upload, PDP-backed storage, purchase flow, and on-chain-gated decryption. Remaining gaps for production are decentralizing discovery/indexing, hardening long-term storage economics, and onboarding real suppliers.

| Number | Grant Deliverable | Briefly describe how you will meet deliverable objectives | Timeframe (within 3 months) |
| :--- | :--- | :--- | :--- |
| 1. | Event-indexed discovery (reduce backend dependence) | Build frontend/backend indexers from `DatasetRegistered` and `DatasetPurchased` logs directly via FVM RPC. SQLite remains cache only; app can recover from chain state. | Month 1 |
| 2. | Buyer-side integrity UX and proof tooling | `contentHash` already exists on-chain. Deliver polished verify flows, canonical hash-check utility, and mismatch/error UX so non-crypto users can verify downloaded data safely. | Month 1 |
| 3. | DataDAO treasury contract for renewal funding | Deploy treasury that receives a share of purchases and allocates funds for storage renewal policy. Add governance token or vote mechanism for preservation prioritization. | Month 2 |
| 4. | Mainnet pilot and researcher onboarding | Deploy on Filecoin mainnet, onboard 5-10 real neuroscience contributors, and publish a step-by-step onboarding playbook for non-Web3 labs. | Month 3 |

---

### 4. What is the total amount of this grant request?

**$7,000 USD**

Justification: $5,000 for engineering and protocol deliverables, plus $2,000 for mainnet pilot execution (storage costs, transactions, and operational onboarding overhead).

---

### 5. Adoption, Reach, and Growth Strategies

**Target audience:**
- Academic neuroscience researchers with EEG datasets (supply side)
- BCI startups, neurotech companies, and AI labs needing neural data (demand side)

**Go-to-market plan:**
- **First 10 users:** direct outreach to researchers already publishing EEG data (PhysioNet/DANDI communities)
- **First 100 users:** publish a technical tutorial and walkthrough, share in open neuroscience/BCI communities, and use verification-first demos (PieceCID and on-chain access checks)
- **Filecoin ecosystem growth:** each upload creates PDP-backed storage activity and each purchase drives FVM transactions; treasury-based renewal model compounds on-chain usage over time

---

### 6. If accepted, do you agree to share monthly project updates in this Github Issue until the project described here is complete?

Yes. Monthly updates will include deliverable status, FVM tx counts, dataset/purchase metrics, deployment links, and blockers.

---

### 7. Does your proposal comply with our Community Code of Conduct?

Yes.

---

### 8. Links and submissions

- **Repository:** https://github.com/anxbt/Decentralised_Neuro_MarketPlace
- **Smart contract (Calibration):** https://calibration.filfox.info/en/address/0x0D6C08C9c7031747fe31eDF09EfA9303FC9f3c2b
- **Demo video:** https://youtu.be/e_xVNAVH-9o
- **Hackathon submission (Devpost):** https://devspot.app/projects/1393
- **Public storage verification:**
  - Beryx PieceCID lookup: `https://beryx.io/?search=<PIECE_CID>&network=calibration`
  - Local app route: `/verify/:pieceCid`

---

### Additional questions

**Team members:**
- **Name:** Anubrat Sahoo
- **Email:** anubrat23@gmail.com
- **GitHub:** https://github.com/anxbt
- **Role:** Solo developer (smart contracts, frontend, backend, integrations)

**How did you learn about this grant program?**
Through the PL Genesis hackathon ecosystem and the Filecoin developer community.

---

