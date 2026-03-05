/**
 * Unit Tests for API Client
 * 
 * Tests specific examples and edge cases for the backend API client.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchDatasets,
  fetchDatasetById,
  fetchResearcherDatasets,
  createDataset,
  recordPurchase,
  fetchDatasetPurchases,
  ApiRequestError,
  type Dataset,
  type NewDataset,
  type NewPurchase,
  type Purchase
} from './api'

// Mock fetch globally
const originalFetch = global.fetch

describe('API Client - Unit Tests', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('fetchDatasets', () => {
    it('should fetch all datasets successfully', async () => {
      const mockDatasets: Dataset[] = [
        {
          id: 'dataset-1',
          title: 'EEG Study 1',
          description: 'Test dataset',
          price: '1.5',
          cid: 'QmTest123',
          researcher_address: '0xResearcher1',
          tx_hash: '0xTx1',
          upload_date: '2024-01-01T00:00:00.000Z',
          purchase_count: 5
        }
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDatasets
      })

      const result = await fetchDatasets()

      expect(result).toEqual(mockDatasets)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/datasets',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should return empty array when no datasets exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      })

      const result = await fetchDatasets()

      expect(result).toEqual([])
    })

    it('should throw ApiRequestError on 500 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Database Error',
          message: 'Failed to fetch datasets',
          statusCode: 500
        })
      })

      await expect(fetchDatasets()).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasets()).rejects.toThrow('Failed to fetch datasets')
    })

    it('should throw network error when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(fetchDatasets()).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasets()).rejects.toThrow('Failed to connect to the backend')
    })
  })

  describe('fetchDatasetById', () => {
    it('should fetch a specific dataset by ID', async () => {
      const mockDataset: Dataset = {
        id: 'dataset-123',
        title: 'EEG Study',
        description: 'Test dataset',
        price: '2.0',
        cid: 'QmTest456',
        researcher_address: '0xResearcher',
        tx_hash: '0xTx',
        upload_date: '2024-01-01T00:00:00.000Z',
        purchase_count: 10
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDataset
      })

      const result = await fetchDatasetById('dataset-123')

      expect(result).toEqual(mockDataset)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/datasets/dataset-123',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should throw error for empty dataset ID', async () => {
      await expect(fetchDatasetById('')).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasetById('')).rejects.toThrow('Dataset ID is required')
    })

    it('should throw error for whitespace-only dataset ID', async () => {
      await expect(fetchDatasetById('   ')).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasetById('   ')).rejects.toThrow('Dataset ID is required')
    })

    it('should throw 404 error when dataset not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Not Found',
          message: 'Dataset with ID nonexistent not found',
          statusCode: 404
        })
      })

      await expect(fetchDatasetById('nonexistent')).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasetById('nonexistent')).rejects.toThrow('Dataset with ID nonexistent not found')
    })

    it('should URL-encode special characters in dataset ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({} as Dataset)
      })

      await fetchDatasetById('dataset/with/slashes')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/datasets/dataset%2Fwith%2Fslashes',
        expect.anything()
      )
    })
  })

  describe('fetchResearcherDatasets', () => {
    it('should fetch datasets for a specific researcher', async () => {
      const mockDatasets: Dataset[] = [
        {
          id: 'dataset-1',
          title: 'Study 1',
          description: 'Test',
          price: '1.0',
          cid: 'QmTest1',
          researcher_address: '0xResearcher',
          tx_hash: '0xTx1',
          upload_date: '2024-01-01T00:00:00.000Z',
          purchase_count: 3
        }
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDatasets
      })

      const result = await fetchResearcherDatasets('0xResearcher')

      expect(result).toEqual(mockDatasets)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/datasets/researcher/0xResearcher',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should throw error for empty researcher address', async () => {
      await expect(fetchResearcherDatasets('')).rejects.toThrow(ApiRequestError)
      await expect(fetchResearcherDatasets('')).rejects.toThrow('Researcher address is required')
    })

    it('should return empty array for researcher with no datasets', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      })

      const result = await fetchResearcherDatasets('0xNewResearcher')

      expect(result).toEqual([])
    })
  })

  describe('createDataset', () => {
    const validDataset: NewDataset = {
      id: 'dataset-new',
      title: 'New Study',
      description: 'A new EEG study',
      price: '3.5',
      cid: 'QmNewCID',
      researcher_address: '0xResearcher',
      tx_hash: '0xNewTx'
    }

    it('should create a new dataset successfully', async () => {
      const mockResponse: Dataset = {
        ...validDataset,
        upload_date: '2024-01-01T00:00:00.000Z',
        purchase_count: 0
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      })

      const result = await createDataset(validDataset)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/datasets',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validDataset)
        })
      )
    })

    it('should throw error for missing ID', async () => {
      const invalidDataset = { ...validDataset, id: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Dataset ID is required')
    })

    it('should throw error for missing title', async () => {
      const invalidDataset = { ...validDataset, title: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Dataset title is required')
    })

    it('should throw error for missing description', async () => {
      const invalidDataset = { ...validDataset, description: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Dataset description is required')
    })

    it('should throw error for missing price', async () => {
      const invalidDataset = { ...validDataset, price: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Dataset price is required')
    })

    it('should throw error for missing CID', async () => {
      const invalidDataset = { ...validDataset, cid: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Dataset CID is required')
    })

    it('should throw error for missing researcher address', async () => {
      const invalidDataset = { ...validDataset, researcher_address: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Researcher address is required')
    })

    it('should throw error for missing transaction hash', async () => {
      const invalidDataset = { ...validDataset, tx_hash: '' }
      await expect(createDataset(invalidDataset)).rejects.toThrow('Transaction hash is required')
    })

    it('should throw 400 error for duplicate dataset ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Validation Error',
          message: 'Dataset with ID dataset-new already exists',
          statusCode: 400
        })
      })

      await expect(createDataset(validDataset)).rejects.toThrow(ApiRequestError)
      await expect(createDataset(validDataset)).rejects.toThrow('already exists')
    })
  })

  describe('recordPurchase', () => {
    const validPurchase: NewPurchase = {
      dataset_id: 'dataset-123',
      buyer_address: '0xBuyer',
      tx_hash: '0xPurchaseTx'
    }

    it('should record a purchase successfully', async () => {
      const mockResponse: Purchase = {
        id: 1,
        ...validPurchase,
        purchase_date: '2024-01-01T00:00:00.000Z'
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse
      })

      const result = await recordPurchase(validPurchase)

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/purchases',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validPurchase)
        })
      )
    })

    it('should throw error for missing dataset ID', async () => {
      const invalidPurchase = { ...validPurchase, dataset_id: '' }
      await expect(recordPurchase(invalidPurchase)).rejects.toThrow('Dataset ID is required')
    })

    it('should throw error for missing buyer address', async () => {
      const invalidPurchase = { ...validPurchase, buyer_address: '' }
      await expect(recordPurchase(invalidPurchase)).rejects.toThrow('Buyer address is required')
    })

    it('should throw error for missing transaction hash', async () => {
      const invalidPurchase = { ...validPurchase, tx_hash: '' }
      await expect(recordPurchase(invalidPurchase)).rejects.toThrow('Transaction hash is required')
    })

    it('should throw 404 error when dataset does not exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: 'Not Found',
          message: 'Dataset with ID nonexistent does not exist',
          statusCode: 404
        })
      })

      await expect(recordPurchase(validPurchase)).rejects.toThrow(ApiRequestError)
      await expect(recordPurchase(validPurchase)).rejects.toThrow('does not exist')
    })
  })

  describe('fetchDatasetPurchases', () => {
    it('should fetch purchases for a specific dataset', async () => {
      const mockPurchases: Purchase[] = [
        {
          id: 1,
          dataset_id: 'dataset-123',
          buyer_address: '0xBuyer1',
          tx_hash: '0xTx1',
          purchase_date: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          dataset_id: 'dataset-123',
          buyer_address: '0xBuyer2',
          tx_hash: '0xTx2',
          purchase_date: '2024-01-02T00:00:00.000Z'
        }
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPurchases
      })

      const result = await fetchDatasetPurchases('dataset-123')

      expect(result).toEqual(mockPurchases)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/purchases/dataset/dataset-123',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should throw error for empty dataset ID', async () => {
      await expect(fetchDatasetPurchases('')).rejects.toThrow(ApiRequestError)
      await expect(fetchDatasetPurchases('')).rejects.toThrow('Dataset ID is required')
    })

    it('should return empty array for dataset with no purchases', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => []
      })

      const result = await fetchDatasetPurchases('dataset-no-purchases')

      expect(result).toEqual([])
    })
  })

  describe('ApiRequestError', () => {
    it('should create error with correct properties', () => {
      const error = new ApiRequestError(404, 'Not Found', 'Resource not found')

      expect(error.statusCode).toBe(404)
      expect(error.error).toBe('Not Found')
      expect(error.message).toBe('Resource not found')
      expect(error.name).toBe('ApiRequestError')
    })

    it('should be instanceof Error', () => {
      const error = new ApiRequestError(500, 'Server Error', 'Internal error')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiRequestError)
    })
  })
})
