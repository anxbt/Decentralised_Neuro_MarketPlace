# Building on Filecoin with Synapse SDK + Lit Protocol — Developer Notes

> Real bugs encountered and solutions discovered while building [NeuroMarket](https://github.com/...), a decentralized EEG dataset marketplace on Filecoin. These are intended as contributions to the Filecoin developer ecosystem.

---

## Synapse SDK (`@filoz/synapse-sdk@0.38.0`)

### 1. `Transport must be a custom transport`

**When:** Calling `Synapse.create()` in a browser with ethers.js

**Why:** SDK v0.38 was rewritten from ethers to **viem** internally. It requires a viem `Transport`, not an ethers `BrowserProvider`.

**Fix:**
```typescript
import { custom } from 'viem';

const synapse = Synapse.create({
  account: walletAddress as `0x${string}`,
  transport: custom((window as any).ethereum!),
});
```

> **Note:** Do NOT pass `chain: filecoinCalibration` from `viem/chains` — the SDK's internal `Chain` type extends viem's with extra fields (`genesisTimestamp`, `filbeam`). Let the SDK auto-resolve the chain.

---

### 2. `getBalance is not a function`

**When:** Calling `synapse.payments.getBalance(token)` 

**Why:** In v0.38, every method on `PaymentsService` was refactored from positional arguments to **options objects**.

**Fix:**
```diff
- const balance = await synapse.payments.getBalance(TOKENS.USDFC);
+ const balance = await synapse.payments.balance({ token: TOKENS.USDFC });

- const info = await synapse.payments.getDepositedBalance(TOKENS.USDFC);
+ const info = await synapse.payments.accountInfo({ token: TOKENS.USDFC });
// Returns: { funds, lockupCurrent, lockupRate, lockupLastSettledAt, availableFunds }

- const allowance = await synapse.payments.getAllowance(service, token);
+ const approval = await synapse.payments.serviceApproval({ token: TOKENS.USDFC });
// Returns: { isApproved, rateAllowance, lockupAllowance, rateUsage, lockupUsage }
```

---

### 3. `InsufficientMaxLockupPeriod(payer, operator, 0, 86400)`

**When:** `synapse.storage.upload()` succeeds at uploading bytes but fails at the on-chain commit step.

**Why:** `approveService()` was called without `maxLockupPeriod`. The Pandora service requires at least `86400` epochs (~30 days) to commit data on-chain.

**Fix:**
```typescript
await synapse.payments.approveService({
  rateAllowance: BigInt(ethers.parseUnits("1", 18).toString()),
  lockupAllowance: BigInt(ethers.parseUnits("100", 18).toString()),
  maxLockupPeriod: BigInt(86400),  // ← Required!
});
```

> **Gotcha:** If you already called `approveService()` without `maxLockupPeriod`, the SDK caches `isApproved: true` on-chain. You must **re-call** `approveService()` with the correct parameters to overwrite the approval.

---

### 4. `CONTRACT_ADDRESSES` export removed

**When:** Importing `CONTRACT_ADDRESSES` from `@filoz/synapse-sdk`

**Why:** Removed in v0.38. The SDK resolves contract addresses internally.

**Fix:** Remove the import. If you need the Pandora service address, omit the `service` param from `approveService()` — the SDK uses the default.

---

### 5. Static import crashes Vite (blank page)

**When:** `import { Synapse } from '@filoz/synapse-sdk'` at the top of a file

**Why:** The SDK is ESM-only with Node.js-specific dependencies that Vite can't statically bundle for browsers.

**Fix:** Use lazy dynamic import:
```typescript
let _sdk: typeof import('@filoz/synapse-sdk') | null = null;
async function getSynapseSdk() {
  if (!_sdk) _sdk = await import('@filoz/synapse-sdk');
  return _sdk;
}
```

---

### 6. `404` on `GET /pdp/piece?pieceCid=...` during upload

**Not a bug.** This is a normal **deduplication check**. The SDK asks the storage provider "do you already have this piece?" before uploading. `404 = Not Found = proceed to upload`. You can ignore these safely.

---

### 7. Correct upload flow (v0.38)

```typescript
// 1. Create Synapse instance
const synapse = Synapse.create({
  account: address as `0x${string}`,
  transport: custom(window.ethereum),
});

// 2. One-time setup: deposit USDFC + approve service
await synapse.payments.deposit({ amount: BigInt(10e18), token: 'USDFC' });
await synapse.payments.approveService({
  rateAllowance: BigInt(1e18),
  lockupAllowance: BigInt(100e18),
  maxLockupPeriod: BigInt(86400),
});

// 3. Upload
const result = await synapse.storage.upload(new Uint8Array(data));
console.log('PieceCID:', result.pieceCid.toString());
```

---

## Lit Protocol

### 8. DatilDev network shut down (Feb 25, 2025)

**When:** `ERR_CONNECTION_TIMED_OUT` on all Lit nodes

**Why:** The entire DatilDev network was permanently shut down. All nodes at `datil-dev.litprotocol.com` return HTTP 000.

**Fix:** Migrate from v7 to **v8 SDK** using the **Naga** network:

```diff
- import { LitNodeClient } from '@lit-protocol/lit-node-client';
- const client = new LitNodeClient({ litNetwork: 'datil-dev' });
- await client.connect();
+ import { createLitClient } from '@lit-protocol/lit-client';
+ import { nagaDev } from '@lit-protocol/networks';
+ const litClient = await createLitClient({ network: nagaDev });
```

Migration guide: https://developer.litprotocol.com/guides/v7-to-v8-migration

---

### 9. `global is not defined` / `buffer.Buffer` errors in Vite

**When:** Using `@lit-protocol/lit-node-client` (v7) in a Vite project

**Why:** The v7 SDK bundles `cross-fetch` which references Node.js `global`. Vite doesn't shim this.

**Fix:** Install `vite-plugin-node-polyfills`:
```typescript
// vite.config.ts
import { nodePolyfills } from 'vite-plugin-node-polyfills';
export default defineConfig({
  plugins: [nodePolyfills({ globals: { Buffer: true, global: true, process: true } })],
});
```

> If using v8 SDK, this polyfill may not be needed — v8 removed the `lit-node-client-nodejs` dependency.

---

### 10. `createSiweMessageWithRecaps` not found

**When:** Importing from `@lit-protocol/auth-helpers`

**Why:** Renamed in v8 to `createSiweMessageWithResources`.

**Fix:**
```diff
- import { createSiweMessageWithRecaps } from '@lit-protocol/auth-helpers';
+ import { createSiweMessageWithResources } from '@lit-protocol/auth-helpers';
```

---

### 11. v8 encrypt/decrypt API changes

```diff
// Encryption (no auth needed in v8)
- const { ciphertext, dataToEncryptHash } = await encryptString(
-   { accessControlConditions, chain, dataToEncrypt }, client
- );
+ const { ciphertext, dataToEncryptHash } = await litClient.encrypt({
+   dataToEncrypt, unifiedAccessControlConditions, chain
+ });

// Decryption (auth required)
- const decrypted = await decryptToString(
-   { ciphertext, dataToEncryptHash, accessControlConditions, chain }, client
- );
+ const authContext = await authManager.createEoaAuthContext();
+ const decrypted = await litClient.decrypt({
+   ciphertext, dataToEncryptHash, unifiedAccessControlConditions, chain, authContext
+ });
```

---

## Quick Reference: Working Stack (March 2025)

| Component | Package | Version | Network |
|---|---|---|---|
| Encryption | `@lit-protocol/lit-client` | 8.3.1 | NagaDev |
| Storage | `@filoz/synapse-sdk` | 0.38.0 | Calibration |
| Smart Contract | Solidity (NeuroMarketplace.sol) | — | Calibration FVM |
| Payment Token | USDFC | — | Calibration |
| Storage Provider | ezpdpz.net (Provider #9) | — | Calibration |
