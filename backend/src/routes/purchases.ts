import { Router, Request, Response } from 'express'
import { validatePurchase } from '../middleware/validation.js'
import {
  insertPurchase,
  getPurchasesByDataset,
  NewPurchase
} from '../models/purchase.js'
import { updatePurchaseCount } from '../models/dataset.js'

const router: Router = Router()

// Middleware to handle trailing slashes
router.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path !== '/') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid path: empty parameter not allowed',
      statusCode: 400
    })
  }
  next()
})

/**
 * POST /api/purchases
 * Record a purchase
 */
router.post('/', validatePurchase, (req: Request, res: Response) => {
  try {
    const newPurchase: NewPurchase = {
      dataset_id: req.body.dataset_id,
      buyer_address: req.body.buyer_address,
      tx_hash: req.body.tx_hash
    }

    const purchase = insertPurchase(newPurchase)
    
    // Update the purchase count for the dataset
    try {
      updatePurchaseCount(newPurchase.dataset_id)
    } catch (updateError) {
      // Log the error but don't fail the request since purchase was recorded
      console.error('Warning: Failed to update purchase count:', updateError)
    }
    
    res.status(201).json(purchase)
  } catch (error) {
    console.error('Error recording purchase:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Foreign key constraint violation (dataset doesn't exist)
      if (error.message.includes('does not exist')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          statusCode: 404
        })
      }
    }
    
    // Generic database error
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to record purchase',
      statusCode: 500
    })
  }
})

/**
 * GET /api/purchases/dataset/:id
 * Get all purchases for a specific dataset
 */
router.get('/dataset/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Validate ID is not empty or whitespace-only
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dataset ID is required and cannot be empty',
        statusCode: 400
      })
    }

    const purchases = getPurchasesByDataset(id)
    res.json(purchases)
  } catch (error) {
    console.error('Error fetching dataset purchases:', error)
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to fetch dataset purchases',
      statusCode: 500
    })
  }
})

export default router
