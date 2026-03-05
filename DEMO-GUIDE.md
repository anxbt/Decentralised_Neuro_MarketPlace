# NeuroMarket Demo Guide - Synapse SDK Integration

This guide will walk you through testing the complete Synapse SDK integration with Filecoin storage and PDP proofs.

## 🎯 What's Been Implemented

### ✅ Completed Features

1. **Synapse SDK Integration** (`neuro-market-frontend/src/lib/synapseStorage.ts`)
   - USDFC balance checking
   - One-time setup (deposit + approve)
   - File upload returning PieceCID
   - File download using PieceCID
   - Complete error handling

2. **PDP Proof Display** (`neuro-market-frontend/src/components/PDPProofBadge.tsx`)
   - Compact badges on marketplace cards
   - Full display on dataset detail pages
   - "Verify on Block Explorer" button

3. **Upload Component Updated** (`neuro-market-frontend/src/pages/Upload.tsx`)
   - Now uses Synapse SDK instead of Pinata
   - Checks for USDFC setup before upload
   - Stores PieceCID in backend
   - Max file size: 200 MiB

4. **Smart Contract** (`contracts/src/NeuroMarketplace.sol`)
   - `hasAccess()` function verified (required for Lit Protocol)
   - Ready to store PieceCID

## 🚀 Prerequisites

Before testing, you need TWO types of tokens:

### 1. tFIL (for gas + dataset purchases)
- **Faucet**: https://faucet.calibnet.chainsafe-fil.io/funds.html
- **Used for**: 
  - Gas fees for smart contract transactions
  - Purchasing datasets from researchers

### 2. USDFC (for Filecoin storage payments)
- **Faucet**: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- **Used for**: 
  - Paying for Filecoin storage via Synapse SDK
  - One-time deposit to Payments contract
  - Approving Pandora service as operator

## 📋 Demo Steps

### Step 1: Get Test Tokens

1. **Get tFIL**:
   ```
   1. Go to: https://faucet.calibnet.chainsafe-fil.io/funds.html
   2. Connect your wallet
   3. Request tFIL tokens
   4. Wait for confirmation
   ```

2. **Get USDFC**:
   ```
   1. Go to: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
   2. Enter your wallet address
   3. Request USDFC tokens
   4. Wait for confirmation
   ```

### Step 2: Start the Application

1. **Start Backend** (if not already running):
   ```bash
   cd backend
   pnpm dev
   ```

2. **Start Frontend** (if not already running):
   ```bash
   cd neuro-market-frontend
   pnpm dev
   ```

3. **Open Browser**:
   ```
   Navigate to: http://localhost:8081
   ```

### Step 3: Connect Wallet

1. Click "Connect Wallet" in the navbar
2. Select your wallet (MetaMask, WalletConnect, etc.)
3. Approve the connection
4. Verify your wallet address appears in the navbar

### Step 4: One-Time Synapse Setup

**IMPORTANT**: This only needs to be done ONCE per wallet address.

The upload component will check if setup is complete. If not, you'll see an error message with instructions.

To complete setup manually (if needed):

```typescript
// Open browser console and run:
import { getSynapseManager } from './lib/synapseStorage';

const synapse = getSynapseManager();
await synapse.initialize();

// Step 1: Deposit USDFC (e.g., 10 USDFC)
await synapse.depositUSDFC("10");

// Step 2: Approve Pandora service
await synapse.approvePandoraService("1", "100");

// Verify setup
const isComplete = await synapse.isSetupComplete();
console.log("Setup complete:", isComplete);
```

### Step 5: Upload a Test Dataset

1. **Navigate to Upload Page**:
   - Click "List Dataset" in the navbar

2. **Fill in Dataset Information**:
   - **Dataset Name**: "Test EEG Sleep Study"
   - **Description**: "Sample EEG dataset for testing Synapse integration"
   - **Type**: Select "Sleep EEG"
   - **Technical Specs** (optional):
     - Channel Count: 32
     - Duration: 8 hours
     - Sample Rate: 256 Hz
   - **Price**: 0.1 (tFIL)

3. **Upload a Test File**:
   - Create a small test file (< 200 MiB)
   - Drag and drop or click to browse
   - Supported formats: .edf, .bdf, .csv, .mat, .eeg

4. **Submit Upload**:
   - Click "Encrypt & List Dataset"
   - Watch the progress indicators:
     - ✓ Encrypting with Lit Protocol
     - ✓ Uploading to Filecoin Storage
     - ✓ Registering on Filecoin FVM
     - ✓ Dataset listed

5. **Verify Success**:
   - You should see the PieceCID displayed
   - "✓ Dataset successfully listed!" message
   - Options to view in Marketplace or Dashboard

### Step 6: Verify PDP Proof Display

1. **View in Marketplace**:
   - Navigate to Marketplace
   - Find your uploaded dataset
   - Verify the compact PDP proof badge appears:
     - 🛡️ "Storage proven by Filecoin PDP"

2. **View Dataset Details**:
   - Click on your dataset
   - Scroll to the PDP Proof section
   - Verify full PDP proof display shows:
     - Green shield icon
     - "Storage Proven by Filecoin PDP" heading
     - Full PieceCID
     - "Verify on Block Explorer" button

3. **Verify on Block Explorer**:
   - Click "Verify on Block Explorer"
   - Opens: https://calibration.filfox.info/en/deal/{pieceCid}
   - Verify the PDP proof status on-chain

### Step 7: Test Error Handling

1. **Try uploading without USDFC setup**:
   - Should show error: "Storage setup incomplete..."
   - Provides faucet link

2. **Try uploading file > 200 MiB**:
   - Should show error: "File size must be less than 200 MiB"

3. **Try uploading without wallet connected**:
   - Should prompt to connect wallet

## 🔍 What to Verify

### ✅ Upload Flow Checklist

- [ ] Wallet connects successfully
- [ ] USDFC balance check works
- [ ] Setup completion check works
- [ ] File encryption completes
- [ ] Synapse upload returns PieceCID
- [ ] Smart contract registration succeeds
- [ ] Backend stores metadata with PieceCID
- [ ] Success message displays with PieceCID
- [ ] Form resets after successful upload

### ✅ PDP Proof Display Checklist

- [ ] Compact badge shows on marketplace cards
- [ ] Full PDP proof section shows on detail page
- [ ] PieceCID displays correctly
- [ ] "Verify on Block Explorer" button works
- [ ] Block explorer shows PDP proof status

### ✅ Error Handling Checklist

- [ ] Setup incomplete error shows with faucet link
- [ ] File size validation works (200 MiB max)
- [ ] Wallet connection check works
- [ ] Network errors display user-friendly messages
- [ ] Retry option available on errors

## 🐛 Troubleshooting

### Issue: "Storage setup incomplete" error

**Solution**:
1. Verify you have USDFC in your wallet
2. Run the one-time setup (Step 4)
3. Check setup status in browser console:
   ```javascript
   const synapse = getSynapseManager();
   await synapse.initialize();
   const balances = await synapse.getBalances();
   console.log(balances);
   ```

### Issue: "Failed to initialize Synapse SDK"

**Solution**:
1. Verify wallet is connected
2. Check you're on Filecoin Calibration testnet (chainId 314159)
3. Refresh the page and reconnect wallet

### Issue: Upload fails at "Uploading to Filecoin Storage"

**Solution**:
1. Check USDFC balance: `await synapse.getBalances()`
2. Verify Pandora service approval
3. Check file size (must be < 200 MiB)
4. Check browser console for detailed error

### Issue: PieceCID not displaying

**Solution**:
1. Verify upload completed successfully
2. Check backend stored the PieceCID (not IPFS CID)
3. Refresh the marketplace page

## 📊 Expected Console Output

During a successful upload, you should see:

```
[Upload] Starting upload pipeline for dataset: dataset-1234567890-abc123
[Upload] Step 1: Encrypting file with Lit Protocol...
[Lit] Connected to Lit Protocol DatilDev network
[Upload] Encryption complete. Hash: 0x...
[Upload] Step 2: Uploading to Filecoin storage...
[Synapse] Initializing Synapse SDK...
[Synapse] Connected to network: calibration
[Synapse] Uploading 12345 bytes to Filecoin storage...
[Upload] Uploaded to Filecoin. PieceCID: baga6ea4seaq...
[Upload] Step 3: Registering on Filecoin FVM...
[Upload] Transaction submitted. Hash: 0x...
[Upload] Transaction confirmed!
[Upload] Step 4: Storing metadata in backend...
[API] POST /api/datasets -> 200
[Upload] Metadata stored in backend
[Upload] Upload pipeline complete!
```

## 🎉 Success Criteria

Your demo is successful if:

1. ✅ You can upload a file and receive a PieceCID
2. ✅ The PieceCID is stored in the backend database
3. ✅ PDP proof badges display on marketplace and detail pages
4. ✅ "Verify on Block Explorer" opens the correct URL
5. ✅ Error messages are clear and actionable
6. ✅ The complete upload pipeline works end-to-end

## 📝 Notes

- **PieceCID vs IPFS CID**: PieceCID is cryptographically bound to PDP proofs, unlike regular IPFS CIDs
- **USDFC vs tFIL**: USDFC pays for storage, tFIL pays for gas and purchases
- **One-time setup**: Deposit and approval only needed once per wallet
- **Max file size**: 200 MiB (Synapse SDK limit)
- **Network**: Filecoin Calibration testnet (chainId 314159)

## 🔗 Useful Links

- **tFIL Faucet**: https://faucet.calibnet.chainsafe-fil.io/funds.html
- **USDFC Faucet**: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
- **Block Explorer**: https://calibration.filfox.info
- **Synapse SDK Reference**: https://github.com/FIL-Builders/fs-upload-dapp

## 🎯 Next Steps After Demo

If the demo works successfully:

1. **Update Backend Schema**: Change `cid` column to `piece_cid` in database
2. **Update Smart Contract**: Deploy with PieceCID storage
3. **Implement Download Flow**: Use Synapse SDK to download files
4. **Add Setup UI**: Create a setup wizard for USDFC deposit/approval
5. **Add Balance Display**: Show USDFC balance in UI
6. **Production Deploy**: Deploy to mainnet with real FIL/USDFC

---

**Ready to test?** Follow the steps above and verify each checkpoint! 🚀
