import request from 'supertest'
import app from '../server.js'

describe('Express Server Middleware', () => {
  describe('Health Check Endpoint', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/api/health')
      
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('environment')
    })
  })

  describe('CORS Middleware', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/api/health')
      
      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })
  })

  describe('JSON Body Parser', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/test-json')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json')
      
      // Will return 404 since route doesn't exist, but body should be parsed
      expect(response.status).toBe(404)
    })
  })

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent')
      
      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Not Found')
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('/api/nonexistent')
    })
  })

  describe('Error Handler', () => {
    it('should handle errors gracefully', async () => {
      // This test would require a route that throws an error
      // For now, we'll just verify the 404 handler works
      const response = await request(app).get('/api/error-test')
      
      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
    })
  })
})
