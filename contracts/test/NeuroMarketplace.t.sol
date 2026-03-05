// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/NeuroMarketplace.sol";

contract NeuroMarketplaceTest is Test {
    NeuroMarketplace public marketplace;
    
    address public researcher = address(0x1);
    address public buyer = address(0x2);
    
    function setUp() public {
        marketplace = new NeuroMarketplace();
    }
    
    /// @notice Test successful dataset registration
    function testRegisterDataset() public {
        string memory datasetId = "dataset1";
        string memory cid = "QmTest123";
        uint256 price = 1 ether;
        
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        (string memory storedCid, address storedResearcher, uint256 storedPrice, bool exists) = 
            marketplace.datasets(datasetId);
        
        assertEq(storedCid, cid);
        assertEq(storedResearcher, researcher);
        assertEq(storedPrice, price);
        assertTrue(exists);
    }
    
    /// @notice Test dataset registration emits event
    function testRegisterDatasetEmitsEvent() public {
        string memory datasetId = "dataset1";
        string memory cid = "QmTest123";
        uint256 price = 1 ether;
        
        vm.expectEmit(true, true, false, true);
        emit DatasetRegistered(datasetId, cid, researcher, price);
        
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
    }
    
    /// @notice Event declaration for testing
    event DatasetRegistered(
        string indexed datasetId,
        string cid,
        address indexed researcher,
        uint256 price
    );
    
    /// @notice Test registration with empty dataset ID reverts
    function testRegisterDatasetEmptyIdReverts() public {
        vm.expectRevert("Dataset ID cannot be empty");
        marketplace.registerDataset("", "QmTest123", 1 ether);
    }
    
    /// @notice Test registration with empty CID reverts
    function testRegisterDatasetEmptyCidReverts() public {
        vm.expectRevert("CID cannot be empty");
        marketplace.registerDataset("dataset1", "", 1 ether);
    }
    
    /// @notice Test registration with zero price reverts
    function testRegisterDatasetZeroPriceReverts() public {
        vm.expectRevert("Price must be greater than zero");
        marketplace.registerDataset("dataset1", "QmTest123", 0);
    }
    
    /// @notice Test duplicate registration reverts
    function testRegisterDatasetDuplicateReverts() public {
        string memory datasetId = "dataset1";
        
        vm.startPrank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", 1 ether);
        
        vm.expectRevert("Dataset already exists");
        marketplace.registerDataset(datasetId, "QmTest456", 2 ether);
        vm.stopPrank();
    }
    
    /// @notice Feature: neuromarket, Property 8: Metadata completeness
    /// @dev Property-based test: For any dataset registration transaction, all required 
    ///      metadata fields (datasetId, CID, price, researcher address) should be included 
    ///      and non-empty. Validates: Requirements 3.2
    /// @param datasetIdSeed Seed for generating dataset ID
    /// @param cidSeed Seed for generating CID
    /// @param price Price for the dataset (bounded to valid range)
    function testFuzz_MetadataCompleteness(
        uint256 datasetIdSeed,
        uint256 cidSeed,
        uint256 price
    ) public {
        // Bound inputs to valid ranges
        // Dataset ID: generate non-empty string from seed
        string memory datasetId = string(abi.encodePacked("dataset_", vm.toString(datasetIdSeed)));
        
        // CID: generate non-empty IPFS-like string from seed
        string memory cid = string(abi.encodePacked("Qm", vm.toString(cidSeed)));
        
        // Price: bound to valid range (1 wei to 1000 ether)
        price = bound(price, 1, 1000 ether);
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Verify all metadata fields are complete and non-empty
        (
            string memory storedCid,
            address storedResearcher,
            uint256 storedPrice,
            bool exists
        ) = marketplace.datasets(datasetId);
        
        // Property assertions: All metadata must be complete
        assertTrue(exists, "Dataset must exist after registration");
        assertTrue(bytes(storedCid).length > 0, "CID must not be empty");
        assertTrue(storedResearcher != address(0), "Researcher address must not be zero");
        assertTrue(storedPrice > 0, "Price must be greater than zero");
        
        // Verify stored values match input
        assertEq(storedCid, cid, "Stored CID must match input");
        assertEq(storedResearcher, researcher, "Stored researcher must match caller");
        assertEq(storedPrice, price, "Stored price must match input");
    }
    
    // ============================================
    // Purchase Functionality Tests
    // ============================================
    
    /// @notice Event declaration for purchase testing
    event DatasetPurchased(
        string indexed datasetId,
        address indexed buyer,
        address indexed researcher,
        uint256 price
    );
    
    /// @notice Test successful dataset purchase
    function testPurchaseDataset() public {
        string memory datasetId = "dataset1";
        string memory cid = "QmTest123";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // Record researcher balance before purchase
        uint256 researcherBalanceBefore = researcher.balance;
        
        // Purchase dataset
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify access granted
        assertTrue(marketplace.hasAccess(datasetId, buyer));
        
        // Verify payment transferred
        assertEq(researcher.balance, researcherBalanceBefore + price);
    }
    
    /// @notice Test purchase emits event
    function testPurchaseDatasetEmitsEvent() public {
        string memory datasetId = "dataset1";
        string memory cid = "QmTest123";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // Expect event emission
        vm.expectEmit(true, true, true, true);
        emit DatasetPurchased(datasetId, buyer, researcher, price);
        
        // Purchase dataset
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
    }
    
    /// @notice Test purchase with incorrect payment reverts
    function testPurchaseDatasetIncorrectPaymentReverts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // Try to purchase with wrong amount
        vm.prank(buyer);
        vm.expectRevert("Incorrect payment amount");
        marketplace.purchaseDataset{value: 0.5 ether}(datasetId);
    }
    
    /// @notice Test purchase of non-existent dataset reverts
    function testPurchaseDatasetNonExistentReverts() public {
        vm.deal(buyer, 10 ether);
        
        vm.prank(buyer);
        vm.expectRevert("Dataset does not exist");
        marketplace.purchaseDataset{value: 1 ether}("nonexistent");
    }
    
    /// @notice Test duplicate purchase reverts
    function testPurchaseDatasetDuplicateReverts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // First purchase succeeds
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Second purchase reverts
        vm.prank(buyer);
        vm.expectRevert("Already purchased");
        marketplace.purchaseDataset{value: price}(datasetId);
    }
    
    /// @notice Test hasAccess returns false for non-owners
    function testHasAccessReturnsFalseForNonOwners() public {
        string memory datasetId = "dataset1";
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", 1 ether);
        
        // Verify buyer has no access
        assertFalse(marketplace.hasAccess(datasetId, buyer));
    }
    
    /// @notice Test getDataset returns correct information
    function testGetDataset() public {
        string memory datasetId = "dataset1";
        string memory cid = "QmTest123";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Get dataset info
        (string memory returnedCid, address returnedResearcher, uint256 returnedPrice) = 
            marketplace.getDataset(datasetId);
        
        assertEq(returnedCid, cid);
        assertEq(returnedResearcher, researcher);
        assertEq(returnedPrice, price);
    }
    
    /// @notice Test getDataset reverts for non-existent dataset
    function testGetDatasetNonExistentReverts() public {
        vm.expectRevert("Dataset does not exist");
        marketplace.getDataset("nonexistent");
    }
    
    // ============================================
    // Security Tests (Task 2.7)
    // ============================================
    
    /// @notice Security Test: Purchase with overpayment should revert
    /// @dev Validates Requirement 8.3 - exact payment verification
    function testSecurityPurchaseWithOverpaymentReverts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // Try to purchase with more than required amount
        vm.prank(buyer);
        vm.expectRevert("Incorrect payment amount");
        marketplace.purchaseDataset{value: 2 ether}(datasetId);
    }
    
    /// @notice Security Test: Purchase with underpayment should revert
    /// @dev Validates Requirement 8.3 - exact payment verification
    function testSecurityPurchaseWithUnderpaymentReverts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Give buyer funds
        vm.deal(buyer, 10 ether);
        
        // Try to purchase with less than required amount
        vm.prank(buyer);
        vm.expectRevert("Incorrect payment amount");
        marketplace.purchaseDataset{value: 0.1 ether}(datasetId);
    }
    
    /// @notice Security Test: Purchase with zero payment should revert
    /// @dev Validates Requirement 8.3 - payment validation
    function testSecurityPurchaseWithZeroPaymentReverts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Try to purchase with zero payment
        vm.prank(buyer);
        vm.expectRevert("Incorrect payment amount");
        marketplace.purchaseDataset{value: 0}(datasetId);
    }
    
    /// @notice Security Test: Registration with empty dataset ID should revert
    /// @dev Validates Requirement 8.5 - input validation
    function testSecurityRegisterWithEmptyDatasetIdReverts() public {
        vm.expectRevert("Dataset ID cannot be empty");
        marketplace.registerDataset("", "QmTest123", 1 ether);
    }
    
    /// @notice Security Test: Multiple buyers cannot interfere with each other's access
    /// @dev Validates Requirement 8.5 - access control isolation
    function testSecurityAccessControlIsolation() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        address buyer2 = address(0x3);
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // First buyer purchases
        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify first buyer has access
        assertTrue(marketplace.hasAccess(datasetId, buyer));
        
        // Verify second buyer does NOT have access
        assertFalse(marketplace.hasAccess(datasetId, buyer2));
        
        // Second buyer purchases
        vm.deal(buyer2, 10 ether);
        vm.prank(buyer2);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify both buyers have independent access
        assertTrue(marketplace.hasAccess(datasetId, buyer));
        assertTrue(marketplace.hasAccess(datasetId, buyer2));
    }
    
    /// @notice Security Test: Researcher does not automatically have access to their own dataset
    /// @dev Validates Requirement 8.5 - access control must be explicit through purchase
    function testSecurityResearcherNoAutoAccess() public {
        string memory datasetId = "dataset1";
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", 1 ether);
        
        // Verify researcher does NOT have automatic access
        assertFalse(marketplace.hasAccess(datasetId, researcher));
    }
    
    /// @notice Security Test: Access check for non-existent dataset returns false
    /// @dev Validates Requirement 8.5 - safe access control queries
    function testSecurityAccessCheckNonExistentDataset() public {
        // Check access for non-existent dataset should return false, not revert
        assertFalse(marketplace.hasAccess("nonexistent", buyer));
    }
    
    /// @notice Security Test: Cannot purchase same dataset twice from same address
    /// @dev Validates Requirement 8.3 - duplicate purchase prevention
    function testSecurityDuplicatePurchasePreventionMultipleAttempts() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Give buyer sufficient funds for multiple attempts
        vm.deal(buyer, 10 ether);
        
        // First purchase succeeds
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Second attempt fails
        vm.prank(buyer);
        vm.expectRevert("Already purchased");
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Third attempt also fails
        vm.prank(buyer);
        vm.expectRevert("Already purchased");
        marketplace.purchaseDataset{value: price}(datasetId);
    }
    
    /// @notice Security Test: Payment is transferred to correct researcher
    /// @dev Validates Requirement 8.3 - payment routing security
    function testSecurityPaymentTransferredToCorrectResearcher() public {
        string memory datasetId = "dataset1";
        uint256 price = 1 ether;
        address researcher2 = address(0x4);
        
        // Register dataset from first researcher
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, "QmTest123", price);
        
        // Record balances
        uint256 researcher1BalanceBefore = researcher.balance;
        uint256 researcher2BalanceBefore = researcher2.balance;
        
        // Buyer purchases
        vm.deal(buyer, 10 ether);
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify payment went to correct researcher
        assertEq(researcher.balance, researcher1BalanceBefore + price);
        assertEq(researcher2.balance, researcher2BalanceBefore); // No change
    }
    
    /// @notice Security Test: Registration validates all inputs before state changes
    /// @dev Validates Requirement 8.5 - input validation before state modification
    function testSecurityRegistrationInputValidationOrder() public {
        // These should all revert before any state changes
        
        // Empty dataset ID
        vm.expectRevert("Dataset ID cannot be empty");
        marketplace.registerDataset("", "QmTest123", 1 ether);
        
        // Empty CID
        vm.expectRevert("CID cannot be empty");
        marketplace.registerDataset("dataset1", "", 1 ether);
        
        // Zero price
        vm.expectRevert("Price must be greater than zero");
        marketplace.registerDataset("dataset1", "QmTest123", 0);
        
        // Verify no datasets were created
        vm.expectRevert("Dataset does not exist");
        marketplace.getDataset("dataset1");
    }
    
    /// @notice Feature: neuromarket, Property 14: Purchase atomicity (CEI pattern)
    /// @dev Property-based test: For any successful purchase transaction, the smart contract 
    ///      should: (1) verify payment amount, (2) grant access to buyer, (3) transfer funds 
    ///      to researcher, in that exact order, and emit a purchase event.
    ///      Validates: Requirements 5.3, 5.4, 8.4, 8.6
    /// @param datasetIdSeed Seed for generating dataset ID
    /// @param price Price for the dataset (bounded to valid range)
    function testFuzz_PurchaseAtomicity(
        uint256 datasetIdSeed,
        uint256 price
    ) public {
        // Bound inputs to valid ranges
        string memory datasetId = string(abi.encodePacked("dataset_", vm.toString(datasetIdSeed)));
        string memory cid = string(abi.encodePacked("Qm", vm.toString(datasetIdSeed)));
        price = bound(price, 1, 1000 ether);
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Give buyer sufficient funds
        vm.deal(buyer, price + 1 ether);
        
        // Record researcher balance before purchase
        uint256 researcherBalanceBefore = researcher.balance;
        
        // Purchase dataset
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Property assertions: Verify CEI pattern effects
        
        // EFFECT 1: Access granted to buyer
        assertTrue(
            marketplace.hasAccess(datasetId, buyer),
            "Buyer must have access after purchase"
        );
        
        // INTERACTION: Funds transferred to researcher
        assertEq(
            researcher.balance,
            researcherBalanceBefore + price,
            "Researcher must receive exact payment amount"
        );
        
        // Verify buyer's balance decreased by price
        assertEq(
            buyer.balance,
            1 ether,
            "Buyer balance must decrease by price"
        );
    }
    
    /// @notice Feature: neuromarket, Property 23: Idempotent purchase prevention
    /// @dev Property-based test: For any buyer who has already purchased a dataset, 
    ///      subsequent purchase attempts for the same dataset should be rejected.
    ///      Validates: Requirements 5.3
    /// @param datasetIdSeed Seed for generating dataset ID
    /// @param price Price for the dataset (bounded to valid range)
    function testFuzz_IdempotentPurchasePrevention(
        uint256 datasetIdSeed,
        uint256 price
    ) public {
        // Bound inputs to valid ranges
        string memory datasetId = string(abi.encodePacked("dataset_", vm.toString(datasetIdSeed)));
        string memory cid = string(abi.encodePacked("Qm", vm.toString(datasetIdSeed)));
        price = bound(price, 1, 1000 ether);
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Give buyer sufficient funds for multiple purchases
        vm.deal(buyer, price * 3);
        
        // First purchase succeeds
        vm.prank(buyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify access granted
        assertTrue(marketplace.hasAccess(datasetId, buyer));
        
        // Second purchase attempt must revert
        vm.prank(buyer);
        vm.expectRevert("Already purchased");
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Verify buyer still has access (state unchanged)
        assertTrue(marketplace.hasAccess(datasetId, buyer));
    }
    
    /// @notice Feature: neuromarket, Property 17: On-chain access verification
    /// @dev Property-based test: For any decryption attempt, the hasAccess function should 
    ///      return true only for addresses that have purchased the dataset, and false for 
    ///      all other addresses. This is used by Lit Protocol for access control.
    ///      Validates: Requirements 6.1, 6.4
    /// @param datasetIdSeed Seed for generating dataset ID
    /// @param price Price for the dataset (bounded to valid range)
    /// @param buyerSeed Seed for generating buyer address
    /// @param nonBuyerSeed Seed for generating non-buyer address
    function testFuzz_OnChainAccessVerification(
        uint256 datasetIdSeed,
        uint256 price,
        uint256 buyerSeed,
        uint256 nonBuyerSeed
    ) public {
        // Bound inputs to valid ranges
        string memory datasetId = string(abi.encodePacked("dataset_", vm.toString(datasetIdSeed)));
        string memory cid = string(abi.encodePacked("Qm", vm.toString(datasetIdSeed)));
        price = bound(price, 1, 1000 ether);
        
        // Generate distinct buyer and non-buyer addresses
        address testBuyer = address(uint160(bound(buyerSeed, 1, type(uint160).max)));
        address nonBuyer = address(uint160(bound(nonBuyerSeed, 1, type(uint160).max)));
        
        // Ensure buyer and non-buyer are different addresses
        vm.assume(testBuyer != nonBuyer);
        vm.assume(testBuyer != researcher);
        vm.assume(nonBuyer != researcher);
        
        // Register dataset
        vm.prank(researcher);
        marketplace.registerDataset(datasetId, cid, price);
        
        // Property 1: Before purchase, no one has access
        assertFalse(
            marketplace.hasAccess(datasetId, testBuyer),
            "Buyer should not have access before purchase"
        );
        assertFalse(
            marketplace.hasAccess(datasetId, nonBuyer),
            "Non-buyer should not have access before purchase"
        );
        assertFalse(
            marketplace.hasAccess(datasetId, researcher),
            "Researcher should not have access (must purchase their own dataset)"
        );
        
        // Give buyer funds and purchase dataset
        vm.deal(testBuyer, price + 1 ether);
        vm.prank(testBuyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Property 2: After purchase, only the buyer has access
        assertTrue(
            marketplace.hasAccess(datasetId, testBuyer),
            "Buyer must have access after purchase"
        );
        assertFalse(
            marketplace.hasAccess(datasetId, nonBuyer),
            "Non-buyer must not have access after someone else's purchase"
        );
        assertFalse(
            marketplace.hasAccess(datasetId, researcher),
            "Researcher must not have access without purchasing"
        );
        
        // Property 3: Access persists across multiple checks (idempotent reads)
        assertTrue(
            marketplace.hasAccess(datasetId, testBuyer),
            "Access must persist across multiple checks"
        );
        assertTrue(
            marketplace.hasAccess(datasetId, testBuyer),
            "Access must persist across multiple checks"
        );
        
        // Property 4: Multiple buyers can have independent access
        vm.deal(nonBuyer, price + 1 ether);
        vm.prank(nonBuyer);
        marketplace.purchaseDataset{value: price}(datasetId);
        
        // Both buyers should now have access
        assertTrue(
            marketplace.hasAccess(datasetId, testBuyer),
            "First buyer must still have access"
        );
        assertTrue(
            marketplace.hasAccess(datasetId, nonBuyer),
            "Second buyer must have access after purchase"
        );
    }
}
