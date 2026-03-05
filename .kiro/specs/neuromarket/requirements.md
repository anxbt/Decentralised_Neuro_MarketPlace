# Requirements Document

## Introduction

NeuroMarket is a decentralized EEG dataset marketplace built on Filecoin FVM Calibration testnet. The system enables researchers to encrypt and sell neural datasets while allowing buyers to securely purchase access using tFIL cryptocurrency. The platform leverages Lit Protocol for encryption, Pinata for IPFS storage, and smart contracts for access control.

## Glossary

- **System**: The NeuroMarket platform (frontend, backend, and smart contracts)
- **Researcher**: A user who uploads and sells EEG datasets
- **Buyer**: A user who purchases access to EEG datasets
- **Dataset**: An EEG data file uploaded by a researcher
- **CID**: Content Identifier - IPFS hash of encrypted dataset
- **tFIL**: Test Filecoin tokens used on Calibration testnet
- **Wallet**: Blockchain wallet connected via RainbowKit
- **Lit_Protocol**: Decentralized encryption service (DatilDev network)
- **Pinata**: IPFS pinning service for file storage
- **Smart_Contract**: Solidity contract deployed on FVM Calibration testnet
- **Access_Control**: On-chain record of dataset ownership and purchase rights

## Requirements

### Requirement 1: Wallet Connection

**User Story:** As a user, I want to connect my blockchain wallet, so that I can interact with the marketplace and make purchases.

#### Acceptance Criteria

1. WHEN a user clicks the connect wallet button, THE System SHALL display RainbowKit wallet connection modal
2. WHEN a wallet is successfully connected, THE System SHALL display the user's wallet address
3. WHEN a wallet connection fails, THE System SHALL display an error message and allow retry
4. WHILE a wallet is connected, THE System SHALL maintain the connection state across page navigation
5. WHEN a user disconnects their wallet, THE System SHALL clear all wallet-related state

### Requirement 2: Dataset Upload and Encryption

**User Story:** As a researcher, I want to upload and encrypt my EEG datasets, so that I can sell them securely on the marketplace.

#### Acceptance Criteria

1. WHEN a researcher selects an EEG file, THE System SHALL validate the file format and size
2. WHEN a researcher submits the upload form, THE System SHALL encrypt the file using Lit_Protocol in the browser
3. WHEN encryption completes, THE System SHALL pin the encrypted file to Pinata using JWT authentication
4. WHEN pinning succeeds, THE System SHALL receive and store the IPFS CID
5. IF encryption or pinning fails, THEN THE System SHALL display an error message and maintain form state
6. WHEN the upload process completes, THE System SHALL clear the form and display success confirmation

### Requirement 3: Smart Contract Registration

**User Story:** As a researcher, I want my encrypted datasets registered on-chain, so that buyers can discover and purchase them.

#### Acceptance Criteria

1. WHEN a dataset is successfully uploaded and encrypted, THE System SHALL call the Smart_Contract to register the dataset CID
2. WHEN registering a dataset, THE System SHALL include dataset metadata (title, description, price, researcher address)
3. WHEN the Smart_Contract transaction succeeds, THE System SHALL store the transaction hash in the backend database
4. IF the Smart_Contract transaction fails, THEN THE System SHALL display an error and allow retry
5. WHEN registration completes, THE System SHALL make the dataset visible in the marketplace

### Requirement 4: Marketplace Display

**User Story:** As a buyer, I want to browse available EEG datasets, so that I can find datasets relevant to my research.

#### Acceptance Criteria

1. WHEN a user visits the marketplace page, THE System SHALL display all available datasets
2. WHEN displaying datasets, THE System SHALL show title, description, price, and researcher information
3. WHEN a user clicks on a dataset, THE System SHALL navigate to the dataset detail page
4. WHEN no datasets are available, THE System SHALL display a message indicating an empty marketplace
5. WHEN datasets are loading, THE System SHALL display a loading indicator

### Requirement 5: Dataset Purchase Flow

**User Story:** As a buyer, I want to purchase access to EEG datasets with tFIL, so that I can use the data for my research.

#### Acceptance Criteria

1. WHEN a buyer clicks purchase on a dataset detail page, THE System SHALL verify the wallet is connected
2. WHEN initiating a purchase, THE System SHALL call the Smart_Contract purchase function with the dataset ID and payment amount
3. WHEN the purchase transaction succeeds, THE Smart_Contract SHALL record the buyer's wallet address as having access
4. WHEN the purchase transaction succeeds, THE Smart_Contract SHALL transfer tFIL from buyer to researcher
5. IF the purchase transaction fails, THEN THE System SHALL display an error message with failure reason
6. WHEN a purchase completes, THE System SHALL update the UI to show the buyer owns the dataset

### Requirement 6: Access Control and Decryption

**User Story:** As a buyer, I want to decrypt and download datasets I've purchased, so that I can access the EEG data.

#### Acceptance Criteria

1. WHEN a buyer requests to download a purchased dataset, THE System SHALL verify on-chain ownership via Smart_Contract
2. WHEN ownership is verified, THE System SHALL retrieve the encrypted file from IPFS using the CID
3. WHEN the encrypted file is retrieved, THE System SHALL use Lit_Protocol to decrypt the file in the browser
4. WHEN decrypting, THE Lit_Protocol SHALL verify the buyer's wallet address has on-chain access rights
5. IF the buyer does not own the dataset, THEN THE Lit_Protocol SHALL reject the decryption request
6. WHEN decryption succeeds, THE System SHALL trigger a browser download of the decrypted file
7. IF decryption fails, THEN THE System SHALL display an error message

### Requirement 7: Researcher Dashboard

**User Story:** As a researcher, I want to view and manage my uploaded datasets, so that I can track my sales and dataset performance.

#### Acceptance Criteria

1. WHEN a researcher visits the dashboard, THE System SHALL display all datasets uploaded by that researcher's wallet address
2. WHEN displaying researcher datasets, THE System SHALL show title, upload date, price, and number of purchases
3. WHEN a researcher has no uploaded datasets, THE System SHALL display a message prompting them to upload
4. WHEN datasets are loading, THE System SHALL display a loading indicator

### Requirement 8: Smart Contract Security

**User Story:** As a system architect, I want the smart contract to be secure against common vulnerabilities, so that user funds and data access are protected.

#### Acceptance Criteria

1. THE Smart_Contract SHALL implement the Checks-Effects-Interactions pattern for all state-changing functions
2. THE Smart_Contract SHALL use reentrancy guards on all functions that transfer funds
3. WHEN processing a purchase, THE Smart_Contract SHALL verify payment amount before updating state
4. WHEN processing a purchase, THE Smart_Contract SHALL update access control state before transferring funds
5. THE Smart_Contract SHALL validate all input parameters before executing logic
6. THE Smart_Contract SHALL emit events for all state changes (dataset registration, purchases, access grants)

### Requirement 9: Frontend Navigation

**User Story:** As a user, I want to navigate between different pages of the marketplace, so that I can access all platform features.

#### Acceptance Criteria

1. THE System SHALL provide navigation to the landing page, marketplace, upload form, and researcher dashboard
2. WHEN a user clicks a navigation link, THE System SHALL navigate to the corresponding page without full page reload
3. WHEN navigating, THE System SHALL maintain wallet connection state
4. THE System SHALL display the current page in the navigation UI

### Requirement 10: Backend Data Management

**User Story:** As a system administrator, I want dataset metadata stored reliably, so that the marketplace can function efficiently.

#### Acceptance Criteria

1. WHEN a dataset is registered, THE Backend SHALL store metadata in SQLite database
2. WHEN the marketplace page loads, THE Backend SHALL provide dataset listings via REST API
3. WHEN a dataset detail page loads, THE Backend SHALL provide full dataset information via REST API
4. WHEN the researcher dashboard loads, THE Backend SHALL filter datasets by researcher wallet address
5. THE Backend SHALL validate all API requests before processing
6. IF database operations fail, THEN THE Backend SHALL return appropriate error responses

### Requirement 11: Lit Protocol Integration

**User Story:** As a developer, I want to integrate Lit Protocol correctly, so that encryption and access control work reliably.

#### Acceptance Criteria

1. THE System SHALL use Lit_Protocol DatilDev network (free tier)
2. WHEN encrypting a file, THE System SHALL use Lit_Protocol encryptFile function in the browser
3. WHEN decrypting a file, THE System SHALL use Lit_Protocol decryptToFile function in the browser
4. WHEN setting access control conditions, THE System SHALL configure Lit_Protocol to check on-chain ownership via Smart_Contract
5. THE System SHALL handle Lit_Protocol authentication and session management
6. IF Lit_Protocol operations fail, THEN THE System SHALL display user-friendly error messages

### Requirement 12: Pinata IPFS Integration

**User Story:** As a developer, I want to integrate Pinata for IPFS storage, so that encrypted datasets are stored reliably.

#### Acceptance Criteria

1. THE System SHALL use Pinata free tier with JWT authentication
2. WHEN pinning a file, THE System SHALL use Pinata API to upload the encrypted file
3. WHEN pinning succeeds, THE System SHALL receive and store the IPFS CID
4. WHEN retrieving a file, THE System SHALL use the IPFS CID to fetch from Pinata gateway
5. THE System SHALL handle Pinata API rate limits gracefully
6. IF Pinata operations fail, THEN THE System SHALL display error messages and allow retry
