import request from 'supertest'
import * as fc from 'fast-check'
import app from '../server.js'
import db from '../db/sqlite.js'

describe('Feature: neuromarket, Property 25: API input validation', () => {
  // Clean up database before each test
  beforeEach(() => {
    db.exec('DELETE FROM purchases')
    db.exec('DELETE FROM datasets')
  })

  /**
   * Property 25: API input validation
   * For any API request with invalid or malformed data, the backend should 
   * return a 400-level error response without processing the request
   * Validates: Requirements 10.5
   */
  it('should reject all invalid dataset inputs with 400-level errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string())
          ), { nil: undefined }),
          title: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string())
          ), { nil: undefined }),
          description: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean()
          ), { nil: undefined }),
          price: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('-1'),
            fc.constant('0'),
            fc.constant('-100.5'),
            fc.constant('not-a-number'),
            fc.constant('NaN'),
            fc.constant('Infinity'),
            fc.integer(),
            fc.boolean()
          ), { nil: undefined }),
          cid: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean()
          ), { nil: undefined }),
          researcher_address: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean()
          ), { nil: undefined }),
          tx_hash: fc.option(fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.integer(),
            fc.boolean()
          ), { nil: undefined })
        }),
        async (invalidData) => {
          // Skip if all fields are valid (we want to test invalid cases)
          const hasValidId = typeof invalidData.id === 'string' && invalidData.id.trim() !== ''
          const hasValidTitle = typeof invalidData.title === 'string' && invalidData.title.trim() !== ''
          const hasValidDescription = typeof invalidData.description === 'string' && invalidData.description.trim() !== ''
          const hasValidPrice = typeof invalidData.price === 'string' && 
            invalidData.price.trim() !== '' && 
            !isNaN(parseFloat(invalidData.price)) && 
            parseFloat(invalidData.price) > 0
          const hasValidCid = typeof invalidData.cid === 'string' && invalidData.cid.trim() !== ''
          const hasValidResearcher = typeof invalidData.researcher_address === 'string' && 
            invalidData.researcher_address.trim() !== ''
          const hasValidTxHash = typeof invalidData.tx_hash === 'string' && invalidData.tx_hash.trim() !== ''

          // If all fields are valid, skip this test case
          if (hasValidId && hasValidTitle && hasValidDescription && hasValidPrice && 
              hasValidCid && hasValidResearcher && hasValidTxHash) {
            return true
          }

          const response = await request(app)
            .post('/api/datasets')
            .send(invalidData)

          // Should return 400-level error (400-499)
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(response.status).toBeLessThan(500)
          
          // Should have error information
          expect(response.body).toHaveProperty('error')
          expect(response.body).toHaveProperty('message')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 25 (continued): API input validation for GET endpoints
   * Empty or invalid path parameters should be handled gracefully
   */
  it('should handle invalid path parameters gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim() === ''),
          fc.hexaString({ minLength: 100, maxLength: 200 }) // Very long ID
        ),
        async (invalidId) => {
          // Test GET /api/datasets/:id with invalid ID
          const response = await request(app).get(`/api/datasets/${encodeURIComponent(invalidId)}`)
          
          // Should either return 400 (validation error) or 404 (not found)
          // Both are acceptable for invalid IDs
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(response.status).toBeLessThan(500)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 25 (continued): API input validation for malformed JSON
   * Malformed request bodies should be rejected
   */
  it('should reject malformed JSON payloads', async () => {
    const malformedPayloads = [
      '{ invalid json }',
      '{ "title": "test", }', // Trailing comma
      '{ "title": undefined }',
      'not json at all',
      '{ "nested": { "unclosed": { }',
      ''
    ]

    for (const payload of malformedPayloads) {
      const response = await request(app)
        .post('/api/datasets')
        .set('Content-Type', 'application/json')
        .send(payload)

      // Should return 400-level error
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)
    }
  })

  /**
   * Property 25 (continued): Type validation
   * Fields with wrong types should be rejected
   */
  it('should reject datasets with wrong field types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          title: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          description: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          price: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          cid: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          researcher_address: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object()),
          tx_hash: fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string()), fc.object())
        }),
        async (invalidTypedData) => {
          const response = await request(app)
            .post('/api/datasets')
            .send(invalidTypedData)

          // Should return 400-level error for wrong types
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(response.status).toBeLessThan(500)
          expect(response.body).toHaveProperty('error')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 25 (continued): Boundary value testing for price
   * Edge cases for price validation
   */
  it('should reject invalid price values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.double({ min: -1000, max: 0 }), // Negative or zero
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity)
        ),
        async (invalidPrice) => {
          const dataset = {
            id: 'test-id',
            title: 'Test Dataset',
            description: 'Test description',
            price: String(invalidPrice),
            cid: 'QmTest123',
            researcher_address: '0x1234567890123456789012345678901234567890',
            tx_hash: '0xabcdef'
          }

          const response = await request(app)
            .post('/api/datasets')
            .send(dataset)

          // Should reject invalid prices
          expect(response.status).toBeGreaterThanOrEqual(400)
          expect(response.status).toBeLessThan(500)
          expect(response.body.message).toMatch(/price/i)
        }
      ),
      { numRuns: 100 }
    )
  })
})
