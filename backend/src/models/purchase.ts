import db from '../db/sqlite.js'

export interface Purchase {
  id: number
  dataset_id: string
  buyer_address: string
  tx_hash: string
  purchase_date: string
}

export interface NewPurchase {
  dataset_id: string
  buyer_address: string
  tx_hash: string
}

/**
 * Insert a new purchase into the database
 * @throws {Error} If database operation fails
 */
export function insertPurchase(purchase: NewPurchase): Purchase {
  try {
    const purchase_date = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO purchases (dataset_id, buyer_address, tx_hash, purchase_date)
      VALUES (?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      purchase.dataset_id,
      purchase.buyer_address,
      purchase.tx_hash,
      purchase_date
    )
    
    return {
      id: result.lastInsertRowid as number,
      ...purchase,
      purchase_date
    }
  } catch (error) {
    // Check for foreign key constraint violations
    if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
      throw new Error(`Dataset with ID ${purchase.dataset_id} does not exist`)
    }
    throw new Error(`Failed to insert purchase: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all purchases for a specific dataset
 * @throws {Error} If database operation fails
 */
export function getPurchasesByDataset(datasetId: string): Purchase[] {
  try {
    const stmt = db.prepare('SELECT * FROM purchases WHERE dataset_id = ? ORDER BY purchase_date DESC')
    return stmt.all(datasetId) as Purchase[]
  } catch (error) {
    throw new Error(`Failed to fetch purchases by dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all purchases by a specific buyer
 * @throws {Error} If database operation fails
 */
export function getPurchasesByBuyer(buyerAddress: string): Purchase[] {
  try {
    const stmt = db.prepare('SELECT * FROM purchases WHERE buyer_address = ? ORDER BY purchase_date DESC')
    return stmt.all(buyerAddress) as Purchase[]
  } catch (error) {
    throw new Error(`Failed to fetch purchases by buyer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
