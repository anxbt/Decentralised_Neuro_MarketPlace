# NeuroMarketplace Contract Deployment

## Deployment Information

- **Contract Address**: `0x8F61BF10258AB489d841B5dEdB49A98f738Cc430`
- **Deployer Address**: `0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853`
- **Network**: Filecoin FVM Calibration Testnet (chainId 314159)
- **Transaction Hash**: `0xa52ac6107448763568e0a917b2be4f52d6a863518b8dbd7771c0fcf3e5225017`
- **Deployment Date**: February 25, 2026

## Block Explorer

View contract on Filecoin Calibration explorer:
https://calibration.filfox.info/en/address/0x8F61BF10258AB489d841B5dEdB49A98f738Cc430

## Contract Verification

The contract has been deployed and tested successfully. All 30 tests pass including:
- 26 unit tests
- 4 property-based tests (100 iterations each)

## Manual Testing Results

### Test 1: Check Access (Before Registration)
```bash
cast call 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "hasAccess(string,address)" \
  "test-dataset" \
  "0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853" \
  --rpc-url $RPC_URL
```
**Result**: `false` (0x0...0) ✅ Correct - no access before purchase

### Test 2: Register Dataset
```bash
cast send 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "registerDataset(string,string,uint256)" \
  "test-dataset-1" \
  "QmTestCID123" \
  "1000000000000000000" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --legacy
```
**Result**: Transaction successful ✅
- Block: 3489145
- Gas Used: 8,921,266
- Event emitted: DatasetRegistered

### Test 3: Get Dataset Information
```bash
cast call 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "getDataset(string)" \
  "test-dataset-1" \
  --rpc-url $RPC_URL
```
**Result**: Dataset retrieved successfully ✅
- CID: QmTestCID123
- Researcher: 0xC1F39FAcbB12C6abE4082D1448A7E79132bC4853
- Price: 1 tFIL (1000000000000000000 wei)

## Environment Configuration

### Frontend (.env)
```env
VITE_CONTRACT_ADDRESS=0x8F61BF10258AB489d841B5dEdB49A98f738Cc430
```
✅ Updated

### Backend (.env)
```env
CONTRACT_ADDRESS=0x8F61BF10258AB489d841B5dEdB49A98f738Cc430
```
✅ Updated

## Contract Functions

### Read Functions
- `hasAccess(string datasetId, address buyer) → bool`
- `getDataset(string datasetId) → (string cid, address researcher, uint256 price)`
- `datasets(string datasetId) → (string cid, address researcher, uint256 price, bool exists)`
- `accessControl(string datasetId, address buyer) → bool`

### Write Functions
- `registerDataset(string datasetId, string cid, uint256 price)`
- `purchaseDataset(string datasetId) payable`

### Events
- `DatasetRegistered(string indexed datasetId, string cid, address indexed researcher, uint256 price)`
- `DatasetPurchased(string indexed datasetId, address indexed buyer, address indexed researcher, uint256 price)`

## Next Steps

1. ✅ Contract deployed to FVM Calibration testnet
2. ✅ Contract tested with cast commands
3. ✅ Contract address saved to frontend/.env
4. ✅ Contract address saved to backend/.env
5. ⏭️ Ready to implement backend API (Task 4)
6. ⏭️ Ready to implement frontend components (Tasks 7+)

## Useful Commands

### Check if address has access to dataset
```bash
cast call 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "hasAccess(string,address)" \
  "DATASET_ID" \
  "BUYER_ADDRESS" \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1
```

### Register a new dataset
```bash
cast send 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "registerDataset(string,string,uint256)" \
  "DATASET_ID" \
  "IPFS_CID" \
  "PRICE_IN_WEI" \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1 \
  --private-key $PRIVATE_KEY \
  --legacy
```

### Purchase a dataset
```bash
cast send 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "purchaseDataset(string)" \
  "DATASET_ID" \
  --value PRICE_IN_WEI \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1 \
  --private-key $PRIVATE_KEY \
  --legacy
```

### Get dataset information
```bash
cast call 0x8F61BF10258AB489d841B5dEdB49A98f738Cc430 \
  "getDataset(string)" \
  "DATASET_ID" \
  --rpc-url https://api.calibration.node.glif.io/rpc/v1
```

## Security Notes

- Contract implements Checks-Effects-Interactions pattern
- All inputs are validated before state changes
- Payment amount must match dataset price exactly
- Duplicate purchases are prevented
- Access control is enforced on-chain
- Events are emitted for all state changes

## Test Coverage

- ✅ Dataset registration with validation
- ✅ Purchase flow with CEI pattern
- ✅ Access control verification
- ✅ Duplicate purchase prevention
- ✅ Payment validation
- ✅ Event emission
- ✅ Property-based tests (metadata completeness, purchase atomicity, access verification)
