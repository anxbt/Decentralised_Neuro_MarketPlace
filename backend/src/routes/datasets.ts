import { Router, Request, Response } from 'express'
import { validateDataset } from '../middleware/validation.js'
import {
  insertDataset,
  getDatasets,
  getDatasetById,
  getDatasetsByResearcher,
  NewDataset
} from '../models/dataset.js'

const router: Router = Router()

// Middleware to handle trailing slashes - they indicate empty parameters
router.use((req, res, next) => {
  // req.path is relative to the router mount point
  // If it ends with / and is not exactly /, it's an empty parameter
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
 * POST /api/datasets
 * Store dataset metadata
 */
router.post('/', validateDataset, (req: Request, res: Response) => {
  try {
    const newDataset: NewDataset = {
      id: req.body.id,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      cid: req.body.cid,
      researcher_address: req.body.researcher_address,
      tx_hash: req.body.tx_hash
    }

    const dataset = insertDataset(newDataset)
    res.status(201).json(dataset)
  } catch (error) {
    console.error('Error inserting dataset:', error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Duplicate ID constraint violation
      if (error.message.includes('already exists')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          statusCode: 400
        })
      }
    }
    
    // Generic database error
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to store dataset metadata',
      statusCode: 500
    })
  }
})

/**
 * GET /api/datasets
 * List all datasets
 */
router.get('/', (req: Request, res: Response) => {
  try {
    // Check if the original URL had a trailing slash (indicating empty ID parameter)
    if (req.originalUrl.endsWith('/') && !req.originalUrl.endsWith('/api/datasets')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Dataset ID cannot be empty',
        statusCode: 400
      })
    }
    
    const datasets = getDatasets()
    res.json(datasets)
  } catch (error) {
    console.error('Error fetching datasets:', error)
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to fetch datasets',
      statusCode: 500
    })
  }
})

/**
 * GET /api/datasets/:id
 * Get dataset details
 */
router.get('/:id', (req: Request, res: Response) => {
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

    const dataset = getDatasetById(id)
    
    if (!dataset) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Dataset with ID ${id} not found`,
        statusCode: 404
      })
    }

    res.json(dataset)
  } catch (error) {
    console.error('Error fetching dataset:', error)
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to fetch dataset details',
      statusCode: 500
    })
  }
})

/**
 * GET /api/datasets/researcher/:address
 * Get researcher's datasets
 */
router.get('/researcher/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params
    
    if (!address || address.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Researcher address is required',
        statusCode: 400
      })
    }

    const datasets = getDatasetsByResearcher(address)
    res.json(datasets)
  } catch (error) {
    console.error('Error fetching researcher datasets:', error)
    res.status(500).json({
      error: 'Database Error',
      message: 'Failed to fetch researcher datasets',
      statusCode: 500
    })
  }
})

export default router
