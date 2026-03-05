import { Request, Response, NextFunction } from 'express'

/**
 * Validation middleware for dataset creation
 */
export function validateDataset(req: Request, res: Response, next: NextFunction) {
  const { id, title, description, price, cid, researcher_address, tx_hash } = req.body

  // Check required fields
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Dataset ID is required',
      statusCode: 400
    })
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Title is required',
      statusCode: 400
    })
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Description is required',
      statusCode: 400
    })
  }

  if (!price || typeof price !== 'string' || price.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Price is required',
      statusCode: 400
    })
  }

  // Validate price is a valid number
  const priceNum = parseFloat(price)
  if (isNaN(priceNum) || priceNum <= 0 || !isFinite(priceNum)) {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Price must be a positive number',
      statusCode: 400
    })
  }

  if (!cid || typeof cid !== 'string' || cid.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'CID is required',
      statusCode: 400
    })
  }

  if (!researcher_address || typeof researcher_address !== 'string' || researcher_address.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Researcher address is required',
      statusCode: 400
    })
  }

  if (!tx_hash || typeof tx_hash !== 'string' || tx_hash.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Transaction hash is required',
      statusCode: 400
    })
  }

  next()
}

/**
 * Validation middleware for purchase creation
 */
export function validatePurchase(req: Request, res: Response, next: NextFunction) {
  const { dataset_id, buyer_address, tx_hash } = req.body

  if (!dataset_id || typeof dataset_id !== 'string' || dataset_id.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Dataset ID is required',
      statusCode: 400
    })
  }

  if (!buyer_address || typeof buyer_address !== 'string' || buyer_address.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Buyer address is required',
      statusCode: 400
    })
  }

  if (!tx_hash || typeof tx_hash !== 'string' || tx_hash.trim() === '') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      message: 'Transaction hash is required',
      statusCode: 400
    })
  }

  next()
}
