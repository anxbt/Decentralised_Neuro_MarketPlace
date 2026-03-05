# NeuroMarket Quick Start Guide

## ✅ Backend Status: RUNNING

Your backend is already running on **http://localhost:3001**

Test it:
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok","timestamp":"...","environment":"development"}
```

---

## 🚀 Start the Frontend

```bash
cd neuro-market-frontend
pnpm dev
```

Open http://localhost:5173 in your browser.

---

## 📋 What You Need to Set Up

### 1. Get WalletConnect Project ID (Free)
1. Go to https://cloud.walletconnect.com/
2. Sign up (free)
3. Create a new project
4. Copy the Project ID
5. Add to `neuro-market-frontend/.env`:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

### 2. Get Pinata JWT Token (Free 1GB)
1. Go to https://pinata.cloud/
2. Sign up (free tier: 1GB storage)
3. Go to API Keys → Generate New Key
4. Copy the JWT token
5. Add to `neuro-market-frontend/.env`:
   ```env
   VITE_PINATA_JWT=your_jwt_token_here
   VITE_PINATA_GATEWAY=https://gateway.pinata.cloud
   ```

### 3. Deploy Smart Contract (Optional - Already Deployed)

Your contract is already deployed at:
```
0x8F61BF10258AB489d841B5dEdB49A98f738Cc430
```

To deploy a new one:
```bash
cd contracts
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --legacy
```

Then update `neuro-market-frontend/.env`:
```env
VITE_CONTRACT_ADDRESS=0x_your_new_address
```

### 4. Get Test tFIL Tokens
1. Go to https://faucet.calibration.fildev.network/
2. Enter your wallet address
3. Request test tFIL
4. Wait ~30 seconds for tokens to arrive

---

## 🧪 Test the Application

### Test 1: Connect Wallet
1. Open http://localhost:5173
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve connection
5. Verify wallet address shows in navbar

### Test 2: View Marketplace
1. Navigate to "Marketplace"
2. You should see mock datasets
3. Click on a dataset to view details

### Test 3: Upload Dataset (After Task 7.3 Complete)
1. Navigate to "List Dataset"
2. Fill in dataset details
3. Upload a test file
4. Watch progress: Encrypting → Pinning → Registering
5. Approve transaction in MetaMask

### Test 4: Purchase Dataset (After Task 13.5 Complete)
1. Use a different wallet
2. Navigate to dataset detail
3. Click "Purchase Dataset"
4. Approve transaction
5. Verify download button appears

### Test 5: Download & Decrypt (After Task 14.2 Complete)
1. Click "Decrypt & Download"
2. Lit Protocol verifies access
3. File decrypts and downloads

---

## 🔍 Troubleshooting

### Backend won't start
```bash
# Kill any process on port 3001
lsof -ti:3001 | xargs kill -9

# Start backend
cd backend
pnpm dev
```

### Frontend won't start
```bash
# Install dependencies
cd neuro-market-frontend
pnpm install

# Start dev server
pnpm dev
```

### "Cannot connect wallet"
- Install MetaMask browser extension
- Switch to Filecoin Calibration testnet (chainId 314159)
- Add network manually if needed:
  - Network Name: Filecoin Calibration
  - RPC URL: https://api.calibration.node.glif.io/rpc/v1
  - Chain ID: 314159
  - Currency Symbol: tFIL

### "Pinata upload failed"
- Verify VITE_PINATA_JWT is correct in `.env`
- Check you haven't exceeded 1GB free tier
- Try regenerating JWT token on Pinata dashboard

### "Transaction failed"
- Ensure you have tFIL in your wallet
- Check you're on Filecoin Calibration testnet
- Verify contract address is correct

---

## 📊 Current Implementation Status

### ✅ Complete
- Backend API (running on port 3001)
- Smart contracts (deployed and tested)
- Database (SQLite with schema)
- Lit Protocol integration (lib/lit.ts)
- Pinata integration (lib/pinata.ts)
- Contract wrapper (lib/contract.ts)
- API client (lib/api.ts)
- All UI components (pages and forms)
- Navigation and routing

### 🔄 In Progress
- Task 7.3: RainbowKit + wagmi integration (mock wallet currently)

### ⏳ Pending
- Task 11.3: Connect upload form to lib functions
- Task 12.1: Connect marketplace to backend API
- Task 13.5: Connect purchase flow to smart contract
- Task 14.1-14.2: Implement download/decrypt functionality
- Task 15.1: Connect dashboard to backend API

---

## 🎯 Next Priority

**Task 7.3**: Replace mock wallet with real RainbowKit + wagmi integration

This is the critical blocker. Once real wallet connections work, all other integrations can be tested end-to-end.

---

## 📚 Additional Resources

- **Architecture Guide**: See `ARCHITECTURE.md` for detailed explanation of Lit Protocol and storage
- **Tasks**: See `.kiro/specs/neuromarket/tasks.md` for complete task list
- **Design**: See `.kiro/specs/neuromarket/design.md` for system design
- **Requirements**: See `.kiro/specs/neuromarket/requirements.md` for acceptance criteria

---

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Check backend logs in terminal
3. Verify all environment variables are set
4. Test each component individually
5. Review the ARCHITECTURE.md for how components interact

The infrastructure is solid - now it's about connecting the pieces!
