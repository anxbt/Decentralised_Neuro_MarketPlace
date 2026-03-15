// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.0;

/**
 * @title NeuroMarketplace
 * @notice Decentralized marketplace for EEG datasets on Filecoin FVM
 * @dev Implements dataset registration, purchase flow, and access control
 */
contract NeuroMarketplace {
    /// @notice Dataset information stored on-chain
    struct Dataset {
        string cid;              // IPFS content identifier
        address researcher;      // Dataset owner
        uint256 price;          // Price in wei (tFIL)
        bytes32 contentHash;    // SHA-256 hash of plaintext file (for buyer verification)
        bool exists;            // Registration flag
    }
    
    /// @notice Mapping from datasetId to Dataset struct
    mapping(string => Dataset) public datasets;
    
    /// @notice Access control mapping: datasetId => buyer => hasAccess
    mapping(string => mapping(address => bool)) public accessControl;
    
    /// @notice Emitted when a new dataset is registered
    event DatasetRegistered(
        string indexed datasetId,
        string cid,
        address indexed researcher,
        uint256 price,
        bytes32 contentHash
    );
    
    /// @notice Emitted when a dataset is purchased
    event DatasetPurchased(
        string indexed datasetId,
        address indexed buyer,
        address indexed researcher,
        uint256 price
    );
    
    /**
     * @notice Register a new dataset on the marketplace
     * @param datasetId Unique identifier for the dataset
     * @param cid IPFS content identifier for the encrypted file
     * @param price Price in wei (tFIL) for purchasing access
     * @param contentHash SHA-256 hash of the plaintext file (buyers verify post-decrypt)
     * @dev Validates inputs before registration
     * Requirements:
     * - datasetId must not be empty
     * - datasetId must not already exist
     * - cid must not be empty
     * - price must be greater than zero
     * - contentHash must not be zero
     */
    function registerDataset(
        string memory datasetId,
        string memory cid,
        uint256 price,
        bytes32 contentHash
    ) external {
        // Input validation (Requirement 8.5)
        require(bytes(datasetId).length > 0, "Dataset ID cannot be empty");
        require(!datasets[datasetId].exists, "Dataset already exists");
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(price > 0, "Price must be greater than zero");
        require(contentHash != bytes32(0), "Content hash cannot be zero");
        
        // Store dataset information
        datasets[datasetId] = Dataset({
            cid: cid,
            researcher: msg.sender,
            price: price,
            contentHash: contentHash,
            exists: true
        });
        
        // Emit event for state change (Requirement 8.6)
        emit DatasetRegistered(datasetId, cid, msg.sender, price, contentHash);
    }
    
    /**
     * @notice Purchase access to a dataset
     * @param datasetId Unique identifier for the dataset to purchase
     * @dev Implements Checks-Effects-Interactions pattern for security
     * Requirements:
     * - Dataset must exist
     * - Payment amount must match dataset price exactly
     * - Buyer must not have already purchased the dataset
     * - Payment transfer to researcher must succeed
     * 
     * Checks-Effects-Interactions Pattern:
     * 1. CHECKS: Validate all conditions before state changes
     * 2. EFFECTS: Update state (grant access)
     * 3. INTERACTIONS: Transfer funds to researcher
     */
    function purchaseDataset(string memory datasetId) external payable {
        // CHECKS (Requirements 8.3, 5.2)
        Dataset storage dataset = datasets[datasetId];
        require(dataset.exists, "Dataset does not exist");
        require(msg.value == dataset.price, "Incorrect payment amount");
        require(!accessControl[datasetId][msg.sender], "Already purchased");
        
        // EFFECTS (Requirements 5.3, 8.4)
        accessControl[datasetId][msg.sender] = true;
        
        // INTERACTIONS (Requirements 5.4)
        (bool success, ) = dataset.researcher.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        // Emit event for state change (Requirement 8.6)
        emit DatasetPurchased(datasetId, msg.sender, dataset.researcher, msg.value);
    }
    
    /**
     * @notice Check if an address has access to a dataset
     * @param datasetId Unique identifier for the dataset
     * @param buyer Address to check access for
     * @return bool True if the buyer has access, false otherwise
     * @dev Used by Lit Protocol for decryption access control
     */
    function hasAccess(
        string memory datasetId,
        address buyer
    ) external view returns (bool) {
        return accessControl[datasetId][buyer];
    }
    
    /**
     * @notice Get dataset information
     * @param datasetId Unique identifier for the dataset
     * @return cid IPFS content identifier
     * @return researcher Dataset owner address
     * @return price Price in wei (tFIL)
     * @return contentHash SHA-256 hash of the plaintext file
     * @dev Reverts if dataset does not exist
     */
    function getDataset(string memory datasetId) 
        external 
        view 
        returns (string memory cid, address researcher, uint256 price, bytes32 contentHash) 
    {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.exists, "Dataset does not exist");
        return (dataset.cid, dataset.researcher, dataset.price, dataset.contentHash);
    }
}

