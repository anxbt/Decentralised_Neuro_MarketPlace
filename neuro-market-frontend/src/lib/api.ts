/**
 * Backend API Client
 * 
 * Provides typed functions for interacting with the NeuroMarket backend API.
 * Handles error responses, request/response logging, and network failures.
 */

// ============================================================================
// Types
// ============================================================================

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

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const DEBUG = import.meta.env.DEV // Enable logging in development mode

/**
 * Log API requests and responses for debugging
 */
function logRequest(method: string, url: string, data?: unknown): void {
  if (DEBUG) {
    console.log(`[API] ${method} ${url}`, data ? { data } : '')
  }
}

function logResponse(method: string, url: string, status: number, data: unknown): void {
  if (DEBUG) {
    console.log(`[API] ${method} ${url} -> ${status}`, data)
  }
}

function logError(method: string, url: string, error: unknown): void {
  console.error(`[API] ${method} ${url} failed:`, error)
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for API errors
 */
export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/**
 * Handle API response and throw errors for non-2xx status codes
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  if (!response.ok) {
    if (isJson) {
      const errorData = await response.json() as ApiError
      throw new ApiRequestError(
        errorData.statusCode || response.status,
        errorData.error || 'API Error',
        errorData.message || response.statusText
      )
    } else {
      throw new ApiRequestError(
        response.status,
        'API Error',
        response.statusText || 'An error occurred'
      )
    }
  }

  if (isJson) {
    return await response.json() as T
  }

  // For non-JSON responses, return empty object
  return {} as T
}

/**
 * Make an API request with error handling and logging
 */
async function apiRequest<T>(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  logRequest(method, url, data)

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    const result = await handleResponse<T>(response)
    
    logResponse(method, url, response.status, result)
    
    return result
  } catch (error) {
    logError(method, url, error)
    
    // Re-throw ApiRequestError as-is
    if (error instanceof ApiRequestError) {
      throw error
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiRequestError(
        0,
        'Network Error',
        'Failed to connect to the backend. Please check your connection and ensure the backend server is running.'
      )
    }
    
    // Handle other errors
    throw new ApiRequestError(
      500,
      'Unknown Error',
      error instanceof Error ? error.message : 'An unknown error occurred'
    )
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * GET /api/datasets
 * Fetch all datasets from the marketplace
 * 
 * @returns Array of all datasets
 * @throws {ApiRequestError} If the request fails
 */
export async function fetchDatasets(): Promise<Dataset[]> {
  return apiRequest<Dataset[]>('GET', '/api/datasets')
}

/**
 * GET /api/datasets/:id
 * Fetch a specific dataset by ID
 * 
 * @param id - Dataset ID
 * @returns Dataset details
 * @throws {ApiRequestError} If the dataset is not found or request fails
 */
export async function fetchDatasetById(id: string): Promise<Dataset> {
  if (!id || id.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset ID is required')
  }
  
  return apiRequest<Dataset>('GET', `/api/datasets/${encodeURIComponent(id)}`)
}

/**
 * GET /api/datasets/researcher/:address
 * Fetch all datasets uploaded by a specific researcher
 * 
 * @param address - Researcher's wallet address
 * @returns Array of datasets uploaded by the researcher
 * @throws {ApiRequestError} If the request fails
 */
export async function fetchResearcherDatasets(address: string): Promise<Dataset[]> {
  if (!address || address.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Researcher address is required')
  }
  
  return apiRequest<Dataset[]>('GET', `/api/datasets/researcher/${encodeURIComponent(address)}`)
}

/**
 * POST /api/datasets
 * Create a new dataset entry in the backend
 * 
 * @param data - New dataset data
 * @returns Created dataset with upload_date and purchase_count
 * @throws {ApiRequestError} If validation fails or request fails
 */
export async function createDataset(data: NewDataset): Promise<Dataset> {
  // Client-side validation
  if (!data.id || data.id.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset ID is required')
  }
  if (!data.title || data.title.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset title is required')
  }
  if (!data.description || data.description.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset description is required')
  }
  if (!data.price || data.price.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset price is required')
  }
  if (!data.cid || data.cid.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset CID is required')
  }
  if (!data.researcher_address || data.researcher_address.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Researcher address is required')
  }
  if (!data.tx_hash || data.tx_hash.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Transaction hash is required')
  }
  
  return apiRequest<Dataset>('POST', '/api/datasets', data)
}

/**
 * POST /api/purchases
 * Record a purchase in the backend
 * 
 * @param data - New purchase data
 * @returns Created purchase with id and purchase_date
 * @throws {ApiRequestError} If validation fails or request fails
 */
export async function recordPurchase(data: NewPurchase): Promise<Purchase> {
  // Client-side validation
  if (!data.dataset_id || data.dataset_id.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset ID is required')
  }
  if (!data.buyer_address || data.buyer_address.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Buyer address is required')
  }
  if (!data.tx_hash || data.tx_hash.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Transaction hash is required')
  }
  
  return apiRequest<Purchase>('POST', '/api/purchases', data)
}

/**
 * GET /api/purchases/dataset/:id
 * Fetch all purchases for a specific dataset
 * 
 * @param datasetId - Dataset ID
 * @returns Array of purchases for the dataset
 * @throws {ApiRequestError} If the request fails
 */
export async function fetchDatasetPurchases(datasetId: string): Promise<Purchase[]> {
  if (!datasetId || datasetId.trim() === '') {
    throw new ApiRequestError(400, 'Validation Error', 'Dataset ID is required')
  }
  
  return apiRequest<Purchase[]>('GET', `/api/purchases/dataset/${encodeURIComponent(datasetId)}`)
}
