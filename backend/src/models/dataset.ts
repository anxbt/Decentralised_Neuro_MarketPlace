import db from '../db/sqlite.js'

export interface Dataset {
  id: string
  title: string
  description: string
  price: string
  cid: string
  researcher_address: string
  tx_hash: string
  upload_date: string
  purchase_count: number
}

export interface NewDataset {
  id: string
  title: string
  description: string
  price: string
  cid: string
  researcher_address: string
  tx_hash: string
}

/**
 * Insert a new dataset into the database
 * @throws {Error} If database operation fails
 */
export function insertDataset(dataset: NewDataset): Dataset {
  try {
    const upload_date = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO datasets (id, title, description, price, cid, researcher_address, tx_hash, upload_date, purchase_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `)
    
    stmt.run(
      dataset.id,
      dataset.title,
      dataset.description,
      dataset.price,
      dataset.cid,
      dataset.researcher_address,
      dataset.tx_hash,
      upload_date
    )
    
    return {
      ...dataset,
      upload_date,
      purchase_count: 0
    }
  } catch (error) {
    // Check for constraint violations (e.g., duplicate ID)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Dataset with ID ${dataset.id} already exists`)
    }
    throw new Error(`Failed to insert dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all datasets
 * @throws {Error} If database operation fails
 */
export function getDatasets(): Dataset[] {
  try {
    const stmt = db.prepare('SELECT * FROM datasets ORDER BY upload_date DESC')
    return stmt.all() as Dataset[]
  } catch (error) {
    throw new Error(`Failed to fetch datasets: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a dataset by ID
 * @throws {Error} If database operation fails
 */
export function getDatasetById(id: string): Dataset | null {
  try {
    const stmt = db.prepare('SELECT * FROM datasets WHERE id = ?')
    const result = stmt.get(id) as Dataset | undefined
    return result || null
  } catch (error) {
    throw new Error(`Failed to fetch dataset by ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get datasets by researcher address
 * @throws {Error} If database operation fails
 */
export function getDatasetsByResearcher(researcherAddress: string): Dataset[] {
  try {
    const stmt = db.prepare('SELECT * FROM datasets WHERE researcher_address = ? ORDER BY upload_date DESC')
    return stmt.all(researcherAddress) as Dataset[]
  } catch (error) {
    throw new Error(`Failed to fetch datasets by researcher: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Update purchase count for a dataset
 * @throws {Error} If database operation fails
 */
export function updatePurchaseCount(datasetId: string): void {
  try {
    const stmt = db.prepare('UPDATE datasets SET purchase_count = purchase_count + 1 WHERE id = ?')
    const result = stmt.run(datasetId)
    
    // Check if the dataset exists
    if (result.changes === 0) {
      throw new Error(`Dataset with ID ${datasetId} not found`)
    }
  } catch (error) {
    throw new Error(`Failed to update purchase count: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
