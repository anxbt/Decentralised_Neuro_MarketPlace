import request from 'supertest'
import app from '../server.js'
import db from '../db/sqlite.js'

describe('Dataset API Endpoints', () => {
  // Clean up database before each test
  beforeEach(() => {
    db.exec('DELETE FROM purchases')
    db.exec('DELETE FROM datasets')
  })

  describe('POST /api/datasets', () => {
    it('should store dataset metadata with valid data', async () => {
      const newDataset = {
        id: 'dataset-123',
        title: 'EEG Study 2024',
        description: 'Neural activity during sleep',
        price: '1.5',
        cid: 'QmTest123abc',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef1234567890'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(newDataset)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id', newDataset.id)
      expect(response.body).toHaveProperty('title', newDataset.title)
      expect(response.body).toHaveProperty('upload_date')
      expect(response.body).toHaveProperty('purchase_count', 0)
    })

    it('should reject dataset with missing title', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        description: 'Test description',
        price: '1.5',
        cid: 'QmTest123',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
      expect(response.body.message).toContain('Title')
    })

    it('should reject dataset with empty title', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        title: '   ',
        description: 'Test description',
        price: '1.5',
        cid: 'QmTest123',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Title')
    })

    it('should reject dataset with invalid price (negative)', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        title: 'Test Dataset',
        description: 'Test description',
        price: '-1.5',
        cid: 'QmTest123',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Price must be a positive number')
    })

    it('should reject dataset with invalid price (zero)', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        title: 'Test Dataset',
        description: 'Test description',
        price: '0',
        cid: 'QmTest123',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Price must be a positive number')
    })

    it('should reject dataset with missing CID', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        title: 'Test Dataset',
        description: 'Test description',
        price: '1.5',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('CID')
    })

    it('should reject dataset with missing researcher address', async () => {
      const invalidDataset = {
        id: 'dataset-123',
        title: 'Test Dataset',
        description: 'Test description',
        price: '1.5',
        cid: 'QmTest123',
        tx_hash: '0xabcdef'
      }

      const response = await request(app)
        .post('/api/datasets')
        .send(invalidDataset)

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Researcher address')
    })
  })

  describe('GET /api/datasets', () => {
    it('should return empty array when no datasets exist', async () => {
      const response = await request(app).get('/api/datasets')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return all datasets', async () => {
      // Insert test datasets
      const dataset1 = {
        id: 'dataset-1',
        title: 'Dataset 1',
        description: 'Description 1',
        price: '1.0',
        cid: 'QmTest1',
        researcher_address: '0x1111111111111111111111111111111111111111',
        tx_hash: '0xhash1'
      }

      const dataset2 = {
        id: 'dataset-2',
        title: 'Dataset 2',
        description: 'Description 2',
        price: '2.0',
        cid: 'QmTest2',
        researcher_address: '0x2222222222222222222222222222222222222222',
        tx_hash: '0xhash2'
      }

      await request(app).post('/api/datasets').send(dataset1)
      await request(app).post('/api/datasets').send(dataset2)

      const response = await request(app).get('/api/datasets')

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('title')
      expect(response.body[0]).toHaveProperty('price')
    })
  })

  describe('GET /api/datasets/:id', () => {
    it('should return dataset details for valid ID', async () => {
      const dataset = {
        id: 'dataset-123',
        title: 'Test Dataset',
        description: 'Test description',
        price: '1.5',
        cid: 'QmTest123',
        researcher_address: '0x1234567890123456789012345678901234567890',
        tx_hash: '0xabcdef'
      }

      await request(app).post('/api/datasets').send(dataset)

      const response = await request(app).get('/api/datasets/dataset-123')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id', 'dataset-123')
      expect(response.body).toHaveProperty('title', 'Test Dataset')
      expect(response.body).toHaveProperty('cid', 'QmTest123')
    })

    it('should return 404 for non-existent dataset ID', async () => {
      const response = await request(app).get('/api/datasets/nonexistent-id')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Not Found')
      expect(response.body.message).toContain('nonexistent-id')
    })

    it('should return 400 for empty dataset ID', async () => {
      const response = await request(app).get('/api/datasets/')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation Error')
    })
  })

  describe('GET /api/datasets/researcher/:address', () => {
    it('should return only datasets for specified researcher', async () => {
      const researcher1Address = '0x1111111111111111111111111111111111111111'
      const researcher2Address = '0x2222222222222222222222222222222222222222'

      const dataset1 = {
        id: 'dataset-1',
        title: 'Dataset 1',
        description: 'Description 1',
        price: '1.0',
        cid: 'QmTest1',
        researcher_address: researcher1Address,
        tx_hash: '0xhash1'
      }

      const dataset2 = {
        id: 'dataset-2',
        title: 'Dataset 2',
        description: 'Description 2',
        price: '2.0',
        cid: 'QmTest2',
        researcher_address: researcher2Address,
        tx_hash: '0xhash2'
      }

      const dataset3 = {
        id: 'dataset-3',
        title: 'Dataset 3',
        description: 'Description 3',
        price: '3.0',
        cid: 'QmTest3',
        researcher_address: researcher1Address,
        tx_hash: '0xhash3'
      }

      await request(app).post('/api/datasets').send(dataset1)
      await request(app).post('/api/datasets').send(dataset2)
      await request(app).post('/api/datasets').send(dataset3)

      const response = await request(app).get(`/api/datasets/researcher/${researcher1Address}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0].researcher_address).toBe(researcher1Address)
      expect(response.body[1].researcher_address).toBe(researcher1Address)
    })

    it('should return empty array for researcher with no datasets', async () => {
      const response = await request(app).get('/api/datasets/researcher/0x9999999999999999999999999999999999999999')

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should return 400 for empty researcher address', async () => {
      const response = await request(app).get('/api/datasets/researcher/')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })
})
