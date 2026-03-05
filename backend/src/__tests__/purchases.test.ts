import request from 'supertest'
import app from '../server.js'
import db from '../db/sqlite.js'

describe('Purchase API Endpoints', () => {
  // Clean up database before each test
  beforeEach(() => {
    db.exec('DELETE FROM purchases')
    db.exec('DELETE FROM datasets')
  })

  // Helper function to create a test dataset
  const createTestDataset = async (id: string = 'dataset-123') => {
    const dataset = {
      id,
      title: 'Test Dataset',
      description: 'Test description',
      price: '1.5',
      cid: 'QmTest123',
      researcher_address: '0x1234567890123456789012345678901234567890',
      tx_hash: '0xabcdef'
    }
    await request(app).post('/api/datasets').send(dataset)
    return dataset
  }

  describe('POST /api/purchases', () => {
    it('should record purchase with valid data', async () => {
      await createTestDataset()

      const newPurchase = {
        dataset_id: 'dataset-123',
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tx_hash: '0x1234567890abcdef'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(newPurchase)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('dataset_id', newPurchase.dataset_id)
      expect(response.body).toHaveProperty('buyer_address', newPurchase.buyer_address)
      expect(response.body).toHaveProperty('tx_hash', newPurchase.tx_hash)
      expect(response.body).toHaveProperty('purchase_date')
    })

    it('should update dataset purchase count after recording purchase', async () => {
      await createTestDataset()

      const newPurchase = {
        dataset_id: 'dataset-123',
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tx_hash: '0x1234567890abcdef'
      }

      await request(app).post('/api/purchases').send(newPurchase)

      // Check that purchase count was incremented
      const datasetResponse = await request(app).get('/api/datasets/dataset-123')
      expect(datasetResponse.body.purchase_count).toBe(1)
    })

    it('should reject purchase with missing dataset_id', async () => {
      const invalidPurchase = {
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tx_hash: '0x1234567890abcdef'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
      expect(response.body.message).toContain('Dataset ID')
    })

    it('should reject purchase with empty dataset_id', async () => {
      const invalidPurchase = {
        dataset_id: '   ',
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tx_hash: '0x1234567890abcdef'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Dataset ID')
    })

    it('should reject purchase with missing buyer_address', async () => {
      const invalidPurchase = {
        dataset_id: 'dataset-123',
        tx_hash: '0x1234567890abcdef'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
      expect(response.body.message).toContain('Buyer address')
    })

    it('should reject purchase with empty buyer_address', async () => {
      const invalidPurchase = {
        dataset_id: 'dataset-123',
        buyer_address: '',
        tx_hash: '0x1234567890abcdef'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Buyer address')
    })

    it('should reject purchase with missing tx_hash', async () => {
      const invalidPurchase = {
        dataset_id: 'dataset-123',
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
      expect(response.body.message).toContain('Transaction hash')
    })

    it('should reject purchase with empty tx_hash', async () => {
      const invalidPurchase = {
        dataset_id: 'dataset-123',
        buyer_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tx_hash: '   '
      }

      const response = await request(app)
        .post('/api/purchases')
        .send(invalidPurchase)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Transaction hash')
    })
  })

  describe('GET /api/purchases/dataset/:id', () => {
    it('should return all purchases for a specific dataset', async () => {
      await createTestDataset('dataset-1')
      await createTestDataset('dataset-2')

      const purchase1 = {
        dataset_id: 'dataset-1',
        buyer_address: '0xbuyer1111111111111111111111111111111111',
        tx_hash: '0xtx1'
      }

      const purchase2 = {
        dataset_id: 'dataset-1',
        buyer_address: '0xbuyer2222222222222222222222222222222222',
        tx_hash: '0xtx2'
      }

      const purchase3 = {
        dataset_id: 'dataset-2',
        buyer_address: '0xbuyer3333333333333333333333333333333333',
        tx_hash: '0xtx3'
      }

      await request(app).post('/api/purchases').send(purchase1)
      await request(app).post('/api/purchases').send(purchase2)
      await request(app).post('/api/purchases').send(purchase3)

      const response = await request(app).get('/api/purchases/dataset/dataset-1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0].dataset_id).toBe('dataset-1')
      expect(response.body[1].dataset_id).toBe('dataset-1')
    })

    it('should return empty array for dataset with no purchases', async () => {
      await createTestDataset()

      const response = await request(app).get('/api/purchases/dataset/dataset-123')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return 400 for empty dataset ID', async () => {
      const response = await request(app).get('/api/purchases/dataset/')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
      expect(response.body.message).toContain('empty parameter')
    })

    it('should return empty array for non-existent dataset', async () => {
      const response = await request(app).get('/api/purchases/dataset/nonexistent-dataset')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })
  })
})
