#!/usr/bin/env node

/**
 * Helper script to add test datasets to the database
 * Usage: node add-test-dataset.js <wallet_address>
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Error: Wallet address is required');
  console.log('Usage: node add-test-dataset.js <wallet_address>');
  console.log('Example: node add-test-dataset.js 0x1234567890123456789012345678901234567890');
  process.exit(1);
}

// Validate wallet address format
if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
  console.error('Error: Invalid wallet address format');
  console.log('Wallet address must be 42 characters starting with 0x');
  process.exit(1);
}

const dbPath = join(__dirname, 'data', 'neuromarket.db');
const db = new Database(dbPath);

try {
  // Create test datasets
  const datasets = [
    {
      id: `test-${Date.now()}-1`,
      title: 'Motor Cortex Activity During Hand Movement',
      description: 'High-resolution EEG recordings of motor cortex activity during various hand movements. Includes 50 subjects performing reaching, grasping, and manipulation tasks.',
      price: '1.5',
      cid: 'QmTestMotorCortex123abc',
      researcher_address: walletAddress,
      tx_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      upload_date: new Date().toISOString(),
      purchase_count: 0
    },
    {
      id: `test-${Date.now()}-2`,
      title: 'Sleep Stage Classification Dataset',
      description: 'Comprehensive sleep study data with labeled sleep stages (Wake, N1, N2, N3, REM). 100 nights of recordings from healthy adults aged 20-40.',
      price: '2.0',
      cid: 'QmTestSleepStages456def',
      researcher_address: walletAddress,
      tx_hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      upload_date: new Date().toISOString(),
      purchase_count: 0
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO datasets (id, title, description, price, cid, researcher_address, tx_hash, upload_date, purchase_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const dataset of datasets) {
    insertStmt.run(
      dataset.id,
      dataset.title,
      dataset.description,
      dataset.price,
      dataset.cid,
      dataset.researcher_address,
      dataset.tx_hash,
      dataset.upload_date,
      dataset.purchase_count
    );
    console.log(`✓ Added dataset: ${dataset.title}`);
  }

  console.log(`\n✓ Successfully added ${datasets.length} test datasets for wallet: ${walletAddress}`);
  console.log('\nYou can now view these datasets in your Dashboard!');

} catch (error) {
  console.error('Error adding test datasets:', error.message);
  process.exit(1);
} finally {
  db.close();
}
