# Implementation Plan: NeuroMarket

## Overview

This implementation plan covers the complete NeuroMarket platform: smart contracts (Solidity on FVM Calibration testnet), backend API (Node.js + Express + SQLite), and frontend (React + Vite + TypeScript). The approach follows an incremental build pattern: smart contracts first (foundation for access control), then backend API (metadata management), then frontend components (user interface and crypto operations), followed by integration testing.

## Current Implementation Status Summary

### ✅ Completed (Tasks 1-6, 8-10, 16, 18-19, 22.1)
- **Smart Contracts**: Fully implemented and tested (NeuroMarketplace.sol)
- **Backend API**: Complete with SQLite database and REST endpoints
- **Frontend Infrastructure**: All lib integrations complete
  - `lib/lit.ts` - Lit Protocol encryption/decryption ✓
  - `lib/pinata.ts` - IPFS pinning and retrieval ✓
  - `lib/contract.ts` - Smart contract wrapper ✓
  - `lib/api.ts` - Backend API client ✓
- **UI Components**: All pages and components created with Tailwind styling
- **Navigation**: React Router configured with all routes

### 🔄 In Progress (Task 7)
- **Wallet Integration**: Mock implementation exists, needs RainbowKit + wagmi v2 integration
  - Task 7.3 is the critical blocker for end-to-end testing

### ⏳ Pending Integration (Tasks 11-15)
- **Upload Flow**: UI complete, needs connection to lib functions
- **Marketplace**: UI complete, needs backend API integration
- **Purchase Flow**: UI complete, needs smart contract integration
- **Download Flow**: Needs implementation using lib/lit.ts and lib/pinata.ts
- **Dashboard**: UI complete, needs backend API integration

### 📋 Next Priority Tasks
1. **Task 7.3**: Integrate RainbowKit + wagmi for real wallet connections
2. **Task 11.3**: Connect upload form to encryption/pinning/registration pipeline
3. **Task 12.1**: Connect marketplace to backend API (fetchDatasets)
4. **Task 13.5**: Connect purchase flow to smart contract
5. **Task 14.1-14.2**: Implement download and decryption functionality
6. **Task 15.1**: Connect dashboard to backend API

## Frontend Implementation Status

**IMPORTANT**: The frontend has been replaced with a new implementation (`neuro-market-frontend/`) that includes:

### ✅ Completed UI Components
- **Navbar**: Full navigation with wallet connect/disconnect, active page highlighting
- **Marketplace**: Dataset grid with search, filtering, sorting, and navigation
- **DatasetDetail**: Comprehensive dataset view with purchase modal
- **Upload**: Complete upload form with drag-and-drop, progress pipeline visualization
- **Dashboard**: Researcher dashboard with stats, listings, and purchased datasets tabs
- **ConnectWalletModal**: Wallet selection modal
- **EEGWaveform**: Visual EEG waveform component
- **PurchaseModal**: Transaction progress modal

### ✅ Completed Infrastructure
- React Router setup with all routes
- WalletContext for state management (mock implementation)
- Tailwind CSS styling with custom design system
- Vitest testing setup
- TypeScript configuration
- Mock dataset data structure

### ⚠️ Missing Integrations (Critical Path)
The UI is complete but needs these integrations to be functional:

1. **RainbowKit + wagmi**: Replace mock WalletContext with real wallet connections (Task 7.3)
2. **Upload Pipeline**: Connect form to lib/lit.ts, lib/pinata.ts, lib/contract.ts, lib/api.ts (Task 11.3-11.6)
3. **Marketplace Data**: Connect to lib/api.ts fetchDatasets() (Task 12.1)
4. **Purchase Flow**: Connect to lib/contract.ts purchaseDataset() (Task 13.5)
5. **Download Flow**: Implement using lib/lit.ts and lib/pinata.ts (Task 14.1-14.2)
6. **Dashboard Data**: Connect to lib/api.ts fetchResearcherDatasets() (Task 15.1)

## Tasks

- [x] 1. Set up project structure and development environment
  - Create frontend directory with Vite + React + TypeScript setup
  - Create backend directory with Node.js + Express + TypeScript setup
  - Create contracts directory with Foundry for Solidity development
  - Configure Foundry for Filecoin FVM Calibration testnet (chainId 314159)
  - Set up SQLite database with initial schema
  - Install frontend dependencies: react, vite, tailwindcss, @rainbow-me/rainbowkit, wagmi, ethers, @lit-protocol/lit-node-client
  - Install backend dependencies: express, sqlite3, ethers, dotenv, cors, typescript
  - Create .env.example files for frontend, backend, and contracts
  - Configure pnpm workspaces for monorepo structure
  - _Requirements: 10.1_

- [ ] 2. Implement smart contract core functionality
  - [x] 2.1 Create NeuroMarketplace.sol with dataset registration
    - Define Dataset struct (cid, researcher, price, exists)
    - Implement registerDataset function with input validation
    - Add datasets mapping (datasetId => Dataset)
    - Emit DatasetRegistered event
    - _Requirements: 3.1, 3.2, 8.5, 8.6_
  
  - [x] 2.2 Write property test for dataset registration
    - **Property 8: Metadata completeness**
    - **Validates: Requirements 3.2**
  
  - [x] 2.3 Implement purchase functionality with CEI pattern
    - Add accessControl mapping (datasetId => buyer => bool)
    - Implement purchaseDataset function with Checks-Effects-Interactions
    - Verify payment amount matches dataset price (Checks)
    - Grant access to buyer (Effects)
    - Transfer tFIL to researcher (Interactions)
    - Emit DatasetPurchased event
    - _Requirements: 5.2, 5.3, 5.4, 8.3, 8.4, 8.6_
  
  - [x] 2.4 Write property test for purchase atomicity
    - **Property 14: Purchase atomicity (CEI pattern)**
    - **Validates: Requirements 5.3, 5.4, 8.4**
  
  - [x] 2.5 Implement access control view functions
    - Create hasAccess function (returns bool)
    - Create getDataset function (returns dataset info)
    - Add view functions for Lit Protocol integration
    - _Requirements: 6.1, 6.4_
  
  - [x] 2.6 Write property test for access control
    - **Property 17: On-chain access verification**
    - **Validates: Requirements 6.1, 6.4**
  
  - [x] 2.7 Write unit tests for smart contract security
    - Test purchase with incorrect payment amount (should revert)
    - Test duplicate purchase prevention (should revert)
    - Test registration with empty CID (should revert)
    - Test registration with zero price (should revert)
    - Test access denial for non-owners
    - _Requirements: 8.3, 8.5_
  
  - [x] 2.8 Add hasAccess public view function to contract
    - Signature: function hasAccess(string memory datasetId, address buyer) public view returns (bool)
    - This is what Lit Protocol calls on-chain to verify access before releasing decryption key
    - Without this the entire encrypt/decrypt flow silently fails
    - _Requirements: 6.1, 6.4_
  
  - [x] 2.9 Replace Pinata with Synapse SDK for storage
    - Install: pnpm add @filoz/synapse-sdk ethers
    - ethers v6 is a required peer dependency — install separately
    - Storage is paid via USDFC token (NOT tFIL — this is a critical difference)
    - Get USDFC on Calibration testnet faucet: https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc
    - One-time setup: deposit USDFC → approve Pandora service → then upload works
    - Upload returns PieceCID (not IPFS CID) — store this in SQLite and on-chain
    - Max upload size: 200 MiB per file
    - _Requirements: 10.1, 3.2_
  
  - [x] 2.10 Implement Synapse upload service (frontend)
    - Create src/lib/synapseStorage.ts
    - Initialize: const synapse = await Synapse.create({ provider }) where provider = ethers.BrowserProvider(window.ethereum)
    - Fund check: verify user has USDFC balance before upload attempt
    - One-time payment flow: deposit USDFC → approve Pandora service → createStorage()
    - Upload: const storage = await synapse.createStorage(); const result = await storage.upload(encryptedBuffer)
    - Return: result.pieceCid — this is your verifiable storage identifier
    - Store pieceCid in both SQLite (via backend) and FVM contract (via registerDataset)
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.11 Implement PDP proof status display (frontend)
    - After upload, show the PieceCID on the dataset detail page
    - Add a "Verify Storage" button that calls storage provider to confirm PDP proof is live
    - This is your demo's "wow moment" — judges can see cryptographic proof, not just a hash
    - Display: PieceCID + "Storage proven by Filecoin PDP" badge on dataset cards
    - _Requirements: 6.4_

- [x] 3. Checkpoint - Deploy and verify smart contract
  - Deploy contract to FVM Calibration testnet using Foundry
  - Verify contract on block explorer
  - Test contract functions manually with cast commands
  - Save deployed contract address for frontend and backend configuration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement backend database layer
  - [x] 4.1 Create database schema and initialization
    - Create datasets table (id, title, description, price, cid, researcher_address, tx_hash, upload_date, purchase_count)
    - Create purchases table (id, dataset_id, buyer_address, tx_hash, purchase_date)
    - Write database initialization script
    - Create database connection module
    - _Requirements: 10.1_
  
  - [x] 4.2 Implement dataset data access layer
    - Create insertDataset function
    - Create getDatasets function (list all)
    - Create getDatasetById function
    - Create getDatasetsByResearcher function (filtered by address)
    - Create updatePurchaseCount function
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 4.3 Write property test for data persistence
    - **Property 24: API data persistence**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [x] 4.4 Implement purchase data access layer
    - Create insertPurchase function
    - Create getPurchasesByDataset function
    - Create getPurchasesByBuyer function
    - _Requirements: 10.1_

- [ ] 5. Implement backend REST API endpoints
  - [x] 5.1 Create Express server with middleware
    - Set up Express app with CORS
    - Add JSON body parser
    - Add error handling middleware
    - Add request validation middleware
    - Create health check endpoint (GET /api/health)
    - _Requirements: 10.5_
  
  - [x] 5.2 Implement dataset endpoints
    - POST /api/datasets - Store dataset metadata
    - GET /api/datasets - List all datasets
    - GET /api/datasets/:id - Get dataset details
    - GET /api/datasets/researcher/:address - Get researcher's datasets
    - Add input validation for all endpoints
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.3 Write property test for API input validation
    - **Property 25: API input validation**
    - **Validates: Requirements 10.5**
  
  - [x] 5.4 Implement purchase tracking endpoint
    - POST /api/purchases - Record purchase
    - GET /api/purchases/dataset/:id - Get dataset purchases
    - Add input validation
    - _Requirements: 10.1_
  
  - [x] 5.5 Write unit tests for API endpoints
    - Test POST /api/datasets with valid data
    - Test POST /api/datasets with invalid data (should return 400)
    - Test GET /api/datasets returns array
    - Test GET /api/datasets/:id with non-existent id (should return 404)
    - Test researcher filtering returns only matching datasets
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.6 Implement error handling for database operations
    - Add try-catch blocks for all database operations
    - Return appropriate HTTP status codes (400, 404, 500)
    - Return error messages in consistent format
    - _Requirements: 10.6_
  
  - [x] 5.7 Write property test for error responses
    - **Property 31: Backend error responses**
    - **Validates: Requirements 10.6**

- [x] 6. Checkpoint - Test backend API
  - Start backend server locally
  - Test all endpoints with curl or Postman
  - Verify database operations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement frontend wallet connection with RainbowKit
  - [x] 7.1 Configure wallet providers and context
    - ✓ Created WalletContext with connect/disconnect functionality
    - ✓ Created ConnectWalletModal component with wallet selection
    - ✓ Integrated wallet state into Navbar component
    - ✓ wagmi configuration file created at src/config/wagmi.ts
    - NOTE: Currently using mock wallet implementation - needs RainbowKit + wagmi integration
    - TODO: Replace WalletContext with RainbowKit + wagmi for real wallet connections
    - TODO: Configure Filecoin FVM Calibration testnet (chainId 314159)
    - _Requirements: 1.1, 1.2_
  
  - [x] 7.2 Implement wallet state management
    - ✓ Created WalletContext with isConnected, address, connect, disconnect
    - ✓ Wallet state persists across page navigation via React Context
    - ✓ Connected wallet address displayed in Navbar
    - NOTE: Mock implementation - needs real wallet integration
    - _Requirements: 1.2, 1.4, 9.3_
  
  - [x] 7.3 Integrate RainbowKit and wagmi for real wallet connections
    - ✓ RainbowKit + wagmi v2 fully integrated
    - ✓ Filecoin FVM Calibration testnet (chainId 314159) configured in wagmi.ts
    - ✓ ethers v6 provider set up
    - ✓ WalletContext uses useConnectModal from RainbowKit
    - ✓ Providers properly configured in main.tsx
    - _Requirements: 1.1, 1.2_
  
  - [x] 7.4 Write property test for wallet state persistence
    - **Property 1: Wallet state persistence**
    - **Validates: Requirements 1.2, 1.4, 9.3**
  
  - [x] 7.5 Implement wallet error handling
    - ✓ Display error messages for connection failures
    - ✓ Provide retry mechanism for failed connections
    - ✓ Clear wallet state on disconnection
    - _Requirements: 1.3, 1.5_
  
  - [x] 7.6 Write property test for wallet disconnection cleanup
    - **Property 2: Wallet disconnection cleanup**
    - **Validates: Requirements 1.5**
  
  - [x] 7.7 Write unit tests for wallet connection
    - ✓ Test connect button opens wallet modal
    - ✓ Test wallet address display after connection
    - ✓ Test error message display on connection failure
    - ✓ Test wallet state cleared on disconnection
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 8. Implement Lit Protocol integration for encryption
  - [x] 8.1 Create Lit Protocol client configuration
    - ✓ Created neuro-market-frontend/src/lib/lit.ts with full implementation
    - ✓ Initialize LitNodeClient with DatilDev network
    - ✓ Configure access control conditions for smart contract verification
    - ✓ Create authentication signature helper functions
    - ✓ Installed @lit-protocol/lit-node-client package
    - _Requirements: 11.1, 11.4, 11.5_
  
  - [x] 8.2 Implement file encryption function
    - ✓ Created encryptFile function using Lit Protocol encryption API
    - ✓ Configure access control conditions to check hasAccess on smart contract
    - ✓ Return encrypted ciphertext and hash
    - ✓ Handle Lit Protocol errors with user-friendly messages
    - _Requirements: 2.2, 11.2, 11.6_
  
  - [x] 8.3 Implement file decryption function
    - ✓ Created decryptFile function using Lit Protocol decryption API
    - ✓ Verify on-chain access before decryption
    - ✓ Return decrypted file for download
    - ✓ Handle access denied errors
    - _Requirements: 6.3, 6.4, 11.3, 11.6_
  
  - [x] 8.4 Write property test for encryption round-trip
    - ✓ Created lit.property.test.ts with round-trip test
    - **Property 16: Encryption round-trip with access control**
    - **Validates: Requirements 2.2, 6.3, 11.2, 11.3**
  
  - [x] 8.5 Write property test for access control verification
    - ✓ Included in lit.property.test.ts
    - **Property 17: On-chain access verification**
    - **Validates: Requirements 6.1, 6.4, 11.4**
  
  - [x] 8.6 Write property test for access denial
    - ✓ Included in lit.property.test.ts
    - **Property 18: Access denial for non-owners**
    - **Validates: Requirements 6.5**

- [x] 9. Implement Pinata IPFS integration
  - [x] 9.1 Create Pinata client with JWT authentication
    - ✓ Created neuro-market-frontend/src/lib/pinata.ts with full implementation
    - ✓ Configure Pinata API client with JWT token from environment
    - ✓ Set up IPFS gateway URL for file retrieval
    - ✓ Installed Pinata SDK
    - _Requirements: 12.1, 12.2_
  
  - [x] 9.2 Implement file pinning function
    - ✓ Created pinFileToPinata function with SDK upload
    - ✓ Include metadata (dataset title, researcher address) in pin
    - ✓ Return IPFS CID on success
    - ✓ Handle Pinata API errors and rate limits
    - _Requirements: 2.3, 2.4, 12.2, 12.3, 12.5, 12.6_
  
  - [x] 9.3 Implement file retrieval function
    - ✓ Created fetchFromIPFS function using CID
    - ✓ Fetch encrypted file from Pinata gateway
    - ✓ Return blob for decryption
    - ✓ Handle network errors with retry option
    - _Requirements: 6.2, 12.4_
  
  - [x] 9.4 Write property test for CID storage
    - ✓ Created pinata.property.test.ts
    - **Property 6: CID generation and storage**
    - **Validates: Requirements 2.4, 3.3, 12.3**
  
  - [x] 9.5 Write property test for IPFS retrieval
    - ✓ Included in pinata.property.test.ts
    - **Property 20: IPFS retrieval by CID**
    - **Validates: Requirements 6.2, 12.4**
  
  - [x] 9.6 Write unit tests for Pinata integration
    - ✓ Created pinata.test.ts with comprehensive tests
    - ✓ Test successful file pinning returns CID
    - ✓ Test pinning with invalid JWT returns error
    - ✓ Test file retrieval with valid CID
    - ✓ Test file retrieval with invalid CID returns error
    - _Requirements: 12.2, 12.3, 12.4, 12.6_

- [x] 10. Checkpoint - Test crypto integrations
  - ✓ Lit Protocol encryption and decryption implemented with tests
  - ✓ Pinata file pinning and retrieval implemented with tests
  - ✓ Access control conditions configured for smart contract verification
  - NOTE: Integration testing with deployed contract pending Task 7.3 (real wallet connection)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement dataset upload form component
  - [x] 11.1 Create UploadForm component with validation
    - ✓ Created Upload.tsx page with comprehensive form
    - ✓ Form includes: title, description, type, technical specs, price, file input
    - ✓ Drag-and-drop file upload interface implemented
    - ✓ File type validation (.edf, .bdf, .csv, .mat, .eeg)
    - ✓ Visual upload progress pipeline with 4 steps
    - NOTE: Form validation is client-side only - needs integration with actual encryption/upload
    - _Requirements: 2.1_
  
  - [x] 11.2 Write property test for file validation
    - **Property 4: File validation before processing**
    - **Validates: Requirements 2.1**
  
  - [x] 11.3 Implement upload pipeline orchestration
    - Connect uploadDataset function to: encrypt → pin → register → store
    - Replace mock progress with real API calls to lib/lit.ts, lib/pinata.ts, lib/contract.ts, lib/api.ts
    - Display progress indicators for each step (encrypting, pinning, registering)
    - Stop pipeline if any step fails
    - _Requirements: 2.2, 2.3, 3.1_
  
  - [x] 11.4 Write property test for upload pipeline integrity
    - **Property 5: Upload pipeline integrity**
    - **Validates: Requirements 2.2, 2.3, 3.1**
  
  - [x] 11.5 Implement smart contract registration call
    - Call registerDataset on smart contract with CID, metadata, and price
    - Wait for transaction confirmation
    - Store transaction hash
    - _Requirements: 3.1, 3.2_
  
  - [x] 11.6 Implement backend metadata storage call
    - Call POST /api/datasets with metadata and transaction hash
    - Handle backend API errors
    - _Requirements: 3.3_
  
  - [x] 11.7 Implement upload completion handling
    - Clear form on successful upload
    - Display success confirmation message with real CID
    - Navigate to marketplace or dataset detail page
    - _Requirements: 2.6, 3.5_
  
  - [x] 11.8 Write property test for upload completion state
    - **Property 7: Upload completion state**
    - **Validates: Requirements 2.6, 3.5**
  
  - [x] 11.9 Implement upload error handling
    - Display specific error messages for each pipeline step failure
    - Maintain form state on error
    - Provide retry option
    - _Requirements: 2.5, 3.4_
  
  - [x] 11.10 Write property test for pipeline error recovery
    - **Property 28: Pipeline error recovery**
    - **Validates: Requirements 2.5, 3.4, 11.6, 12.6**
  
  - [x] 11.11 Write unit tests for upload form
    - Test form validation rejects empty fields
    - Test form validation rejects oversized files
    - Test progress indicators display during upload
    - Test success message displays on completion
    - Test error messages display on failure
    - _Requirements: 2.1, 2.5, 2.6_

- [ ] 12. Implement marketplace listing component
  - [x] 12.1 Create Marketplace component with dataset grid
    - ✓ Created Marketplace.tsx with dataset grid layout
    - ✓ Displays dataset cards with title, description, price, researcher, institution
    - ✓ Shows loading state with backend integration
    - ✓ Shows empty state message when no datasets
    - ✓ Implemented search functionality
    - ✓ Implemented type filtering with category buttons
    - ✓ Implemented sorting (newest, price low/high)
    - ✓ Connected to fetchDatasets() from lib/api.ts
    - ✓ Transforms API data to display format
    - ✓ Loading indicators during API fetch
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [x] 12.2 Write property test for marketplace listing completeness
    - **Property 9: Marketplace listing completeness**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 12.3 Implement dataset navigation
    - ✓ Click handler navigates to dataset detail page
    - ✓ Uses React Router for client-side navigation
    - ✓ Wallet connection state maintained during navigation
    - _Requirements: 4.3, 9.2, 9.3_
  
  - [x] 12.4 Write property test for dataset navigation
    - **Property 10: Dataset navigation**
    - **Validates: Requirements 4.3, 9.2**
  
  - [x] 12.5 Write unit tests for marketplace component
    - Test loading indicator displays while fetching
    - Test empty state message when no datasets
    - Test dataset cards display with correct information
    - Test clicking dataset navigates to detail page
    - Test search filters datasets correctly
    - Test type filters work correctly
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 13. Implement dataset detail and purchase component
  - [x] 13.1 Create DatasetDetail component
    - ✓ Created DatasetDetail.tsx with comprehensive layout
    - ✓ Displays full dataset information (title, description, price, researcher, CID, specs)
    - ✓ Shows technical specifications table
    - ✓ Shows researcher information with avatar
    - ✓ Displays EEG waveform visualization
    - ✓ Connected to fetchDatasetById(id) from lib/api.ts
    - ✓ Loading state while fetching
    - ✓ Checks user access via hasAccess() from lib/contract.ts
    - _Requirements: 4.2_
  
  - [x] 13.2 Implement purchase button and flow
    - ✓ Purchase button verifies wallet connection before allowing purchase
    - ✓ Opens PurchaseModal component on click
    - ✓ Displays transaction progress in modal
    - ✓ Calls purchaseDataset() from lib/contract.ts with payment
    - ✓ Waits for transaction confirmation
    - ✓ Handles transaction errors with user-friendly messages
    - ✓ Shows download button when user has access
    - _Requirements: 5.1, 5.2_
  
  - [x] 13.3 Write property test for purchase precondition verification
    - **Property 12: Purchase precondition verification**
    - **Validates: Requirements 5.1**
  
  - [x] 13.4 Write property test for purchase transaction completeness
    - **Property 13: Purchase transaction completeness**
    - **Validates: Requirements 5.2, 8.3**
  
  - [x] 13.5 Implement purchase success handling
    - ✓ Updates UI to show ownership status after purchase
    - ✓ Enables download button for buyer
    - ✓ Displays success message
    - ✓ Records purchase in backend via recordPurchase() from lib/api.ts
    - ✓ Updates hasAccess state after successful purchase
    - _Requirements: 5.6_
  
  - [x] 13.6 Write property test for purchase UI state update
    - **Property 15: Purchase UI state update**
    - **Validates: Requirements 5.6**
  
  - [x] 13.7 Implement purchase error handling
    - Display error message with failure reason
    - Handle insufficient balance errors
    - Handle transaction rejection errors
    - Handle contract revert errors
    - _Requirements: 5.5_
  
  - [x] 13.8 Write property test for transaction error reporting
    - **Property 29: Transaction error reporting**
    - **Validates: Requirements 5.5**
  
  - [~] 13.9 Write unit tests for purchase flow
    - Test purchase button disabled when wallet not connected
    - Test purchase transaction initiated with correct payment
    - Test success message displays after purchase
    - Test error message displays on transaction failure
    - Test download button enabled after purchase
    - _Requirements: 5.1, 5.2, 5.5, 5.6_

- [ ] 14. Implement download and decryption functionality
  - [x] 14.1 Create download button component
    - ✓ Added download button to DatasetDetail page for owned datasets
    - ✓ Verifies ownership via hasAccess() from lib/contract.ts
    - ✓ Displays loading state during verification
    - ✓ Shows "✓ Owned · Download Dataset" button for purchased datasets
    - ✓ Integrated into PurchaseModal for immediate download after purchase
    - _Requirements: 6.1_
  
  - [x] 14.2 Implement decrypt and download flow
    - ✓ Fetches encrypted file from Filecoin using downloadFile() from lib/synapseStorage.ts
    - ✓ Calls decryptFile() from lib/lit.ts with access conditions
    - ✓ Triggers browser download of decrypted file
    - ✓ Handles errors with user-friendly messages
    - ✓ Shows progress toasts during download/decrypt
    - _Requirements: 6.2, 6.3, 6.6_
  
  - [~] 14.3 Write property test for download trigger
    - **Property 19: Download trigger after decryption**
    - **Validates: Requirements 6.6**
  
  - [~] 14.4 Implement decryption error handling
    - Display "You don't own this dataset" for access denied
    - Display decryption error messages
    - Display IPFS fetch error messages with retry option
    - _Requirements: 6.5, 6.7_
  
  - [~] 14.5 Write property test for decryption error handling
    - **Property 30: Decryption error handling**
    - **Validates: Requirements 6.7**
  
  - [~] 14.6 Write unit tests for download functionality
    - Test download button only visible for owned datasets
    - Test download button disabled for non-owned datasets
    - Test decryption triggered on download click
    - Test browser download triggered after decryption
    - Test access denied error displayed for non-owners
    - _Requirements: 6.1, 6.5, 6.6, 6.7_

- [ ] 15. Implement researcher dashboard component
  - [x] 15.1 Create Dashboard component
    - ✓ Created Dashboard.tsx with comprehensive layout
    - ✓ Displays wallet connection prompt when not connected
    - ✓ Shows stats cards: Total Earned, Datasets Listed, Purchased, Total Sales
    - ✓ Implements tabs for "My Listings" and "Purchased Datasets"
    - ✓ Displays researcher's datasets in table format with title, type, price, sales, earned
    - ✓ Shows purchased datasets with decrypt/download buttons
    - ✓ Connected to fetchResearcherDatasets(address) from lib/api.ts
    - ✓ Calculates real earnings from on-chain data
    - ✓ Loading state while fetching
    - ✓ Listens for purchase events via onDatasetPurchasedByBuyer()
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 15.2 Write property test for researcher dataset filtering
    - **Property 11: Researcher dataset filtering**
    - **Validates: Requirements 7.1, 7.2, 10.4**
  
  - [~] 15.3 Write unit tests for dashboard component
    - Test loading indicator displays while fetching
    - Test empty state message when no datasets
    - Test datasets display with correct information
    - Test only researcher's datasets are shown
    - Test purchased datasets tab shows correct data
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 16. Implement frontend navigation and routing
  - [x] 16.1 Create navigation component
    - ✓ Created Navbar.tsx with navigation links
    - ✓ Navigation includes: Marketplace, List Dataset, Dashboard
    - ✓ Current page highlighted with border-bottom indicator
    - ✓ Wallet connection state maintained across navigation
    - ✓ Connect/Disconnect wallet button in navbar
    - _Requirements: 9.1, 9.3, 9.4_
  
  - [x] 16.2 Configure React Router
    - ✓ Set up routes in App.tsx: /, /marketplace, /upload, /dashboard, /dataset/:id
    - ✓ Implements client-side navigation without full page reload
    - ✓ Added NotFound page for 404 handling
    - _Requirements: 9.2_
  
  - [~] 16.3 Write unit tests for navigation
    - Test navigation links present on all pages
    - Test clicking navigation link navigates without reload
    - Test current page highlighted in navigation
    - Test wallet state maintained during navigation
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 17. Checkpoint - Test frontend components
  - Test wallet connection and disconnection
  - Test dataset upload flow end-to-end
  - Test marketplace browsing and navigation
  - Test purchase flow end-to-end
  - Test download and decryption flow
  - Test researcher dashboard
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement frontend API client
  - [x] 18.1 Create API client module
    - ✓ Created neuro-market-frontend/src/lib/api.ts with full implementation
    - ✓ Created typed functions for all backend endpoints:
      - fetchDatasets() - GET /api/datasets
      - fetchDatasetById(id) - GET /api/datasets/:id
      - fetchResearcherDatasets(address) - GET /api/datasets/researcher/:address
      - createDataset(data) - POST /api/datasets
      - recordPurchase(data) - POST /api/purchases
      - fetchDatasetPurchases(datasetId) - GET /api/purchases/dataset/:id
    - ✓ Add error handling for network failures
    - ✓ Add request/response logging for debugging
    - ✓ Uses fetch API with typed responses
    - _Requirements: 10.2, 10.3, 10.4_
  
  - [x] 18.2 Write unit tests for API client
    - ✓ Created api.test.ts with comprehensive tests
    - ✓ Test successful API calls return expected data
    - ✓ Test API errors are handled gracefully
    - ✓ Test network errors are caught and reported
    - _Requirements: 10.2, 10.3, 10.4_

- [ ] 19. Implement smart contract interaction utilities
  - [x] 19.1 Create contract wrapper with ethers.js
    - ✓ Created neuro-market-frontend/src/lib/contract.ts with full implementation
    - ✓ Import deployed contract ABI
    - ✓ Created typed functions for:
      - registerDataset(datasetId, cid, price)
      - purchaseDataset(datasetId, price)
      - hasAccess(datasetId, address)
      - getDataset(datasetId)
      - formatPrice(priceInWei) / parsePrice(priceInTFIL)
    - ✓ Add event listening utilities for DatasetRegistered and DatasetPurchased
    - ✓ Handle transaction errors and retries
    - ✓ Installed ethers v6 package
    - _Requirements: 3.1, 5.2, 6.1_
  
  - [x] 19.2 Write unit tests for contract utilities
    - ✓ Created contract.test.ts with comprehensive tests
    - ✓ Test registerDataset calls contract with correct parameters
    - ✓ Test purchaseDataset sends correct payment amount
    - ✓ Test hasAccess returns correct boolean
    - ✓ Test event listeners receive emitted events
    - _Requirements: 3.1, 5.2, 6.1_
- [ ] 20. Create integration utilities and documentation
  - [~] 20.1 Create deployment scripts
    - Write Foundry deployment script for FVM Calibration
    - Save deployed contract address to config file
    - Create script to verify contract on explorer
    - _Requirements: 3.1_
  
  - [~] 20.2 Write comprehensive documentation
    - Document all REST endpoints with request/response examples
    - Document required environment variables for all three layers
    - Document database schema
    - Create README with setup instructions for frontend, backend, and contracts
    - Document Lit Protocol and Pinata configuration
    - _Requirements: 10.2, 10.3, 10.4, 11.1, 12.1_
  
  - [~] 20.3 Create integration test suite
    - Test complete upload flow: encrypt → pin → register → store → verify
    - Test complete purchase flow: connect → buy → verify access → record
    - Test complete download flow: verify → fetch → decrypt → download
    - Test researcher dashboard flow: upload → view → verify stats
    - Mock external services (Pinata, Lit Protocol) for deterministic testing
    - _Requirements: 3.1, 5.2, 6.1, 10.1_

- [ ] 21. Implement mock data for development
  - [~] 21.1 Create seed script for database
    - Generate 8 mock EEG datasets with metadata
    - Insert mock datasets into database
    - Create mock purchase records
    - _Requirements: 4.1_
  
  - [~] 21.2 Create mock contract deployment for local testing
    - Deploy contract to local Foundry Anvil network
    - Register mock datasets on local contract
    - Create mock purchases for testing access control
    - _Requirements: 3.1, 5.3_
  
  - [~] 21.3 Create mock encrypted files for testing
    - Generate sample EEG data files
    - Encrypt with Lit Protocol for testing
    - Pin to Pinata or use local IPFS node
    - _Requirements: 2.2, 2.3_

- [ ] 22. Implement UI styling and polish
  - [x] 22.1 Apply Tailwind CSS styling
    - ✓ All components styled with Tailwind utility classes
    - ✓ Responsive design implemented for mobile and desktop
    - ✓ Loading spinners implemented (Loader2 from lucide-react)
    - ✓ Custom design system with consistent colors and typography
    - ✓ Toast notifications configured (Sonner + shadcn/ui toaster)
    - ✓ EEG waveform visualization component created
    - NOTE: Design is complete but needs real data integration
    - _Requirements: 4.5, 7.4_
  
  - [~] 22.2 Implement accessibility features
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Add focus indicators
    - Test with screen readers
    - _Requirements: 9.1, 9.2_
  
  - [~] 22.3 Add user feedback and animations
    - Add smooth transitions between states
    - Add hover effects on interactive elements (already implemented)
    - Add confirmation dialogs for important actions
    - _Requirements: 1.3, 2.5, 5.5_

- [~] 23. Final checkpoint - End-to-end verification
  - Deploy smart contract to FVM Calibration testnet
  - Start backend server with deployed contract address
  - Start frontend with correct environment variables
  - Test complete user journey: connect wallet → upload dataset → browse marketplace → purchase dataset → download dataset
  - Test researcher journey: connect wallet → upload dataset → view dashboard → verify sales
  - Verify all error handling scenarios work correctly
  - Verify wallet connection persists across navigation
  - Verify access control prevents unauthorized downloads
  - Test on multiple browsers (Chrome, Firefox, Safari)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Use pnpm for all package management (not npm or yarn)
- Smart contract must be deployed before backend and frontend can interact with it
- Use FVM Calibration testnet faucet for tFIL: https://faucet.calibration.fildev.network/
- Lit Protocol DatilDev network is free tier (no capacity credits needed)
- Pinata free tier provides 1GB storage with JWT authentication
- All property tests should run minimum 100 iterations
- Integration tests should use local Foundry Anvil network or testnet
- Frontend handles all encryption/decryption (never send unencrypted files)
- Backend is metadata index only (smart contract is source of truth)
- Follow Checks-Effects-Interactions pattern strictly in smart contracts
- Test with real wallet connections (MetaMask, WalletConnect) before deployment
- Verify contract on block explorer for transparency
- Document all API endpoints and contract functions for frontend integration
