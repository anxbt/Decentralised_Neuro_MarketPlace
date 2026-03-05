import { Request, Response, NextFunction } from 'express'

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}

/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err.message)
  console.error('Stack:', err.stack)

  // Handle JSON parsing errors (malformed JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      statusCode: 400
    })
  }

  // Default to 500 Internal Server Error
  const statusCode = 500
  const errorResponse: ErrorResponse = {
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404
  })
}
