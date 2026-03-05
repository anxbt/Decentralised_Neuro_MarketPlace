import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

// Get database path based on environment
function getDatabasePath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH
  }
  
  // For production/development, use file path
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.join(__dirname, '../../data/neuromarket.db')
}

// Initialize database
export const db: Database.Database = new Database(getDatabasePath())

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
export function initializeDatabase() {
  try {
    // Datasets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price TEXT NOT NULL,
        cid TEXT NOT NULL,
        researcher_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        upload_date TEXT NOT NULL,
        purchase_count INTEGER DEFAULT 0
      )
    `)

    // Purchases table
    db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id TEXT NOT NULL,
        buyer_address TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id)
      )
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Initialize on import
initializeDatabase()

export default db
