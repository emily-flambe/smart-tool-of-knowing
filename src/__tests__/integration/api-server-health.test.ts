import request from 'supertest'
import { app } from '../../simple-api-server'

describe('API Server Health Check Tests', () => {
  describe('GET /api/', () => {
    it('should return API server information', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200)

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Smart Tool of Knowing API Server'),
        status: 'online',
        version: expect.any(String),
        endpoints: expect.objectContaining({
          health: '/api/health',
          cycles: '/api/cycles',
          backlog: '/api/backlog',
          teamMembers: '/api/team-members',
          activeEngineers: '/api/active-engineers',
          newsletter: 'POST /api/newsletter/generate'
        }),
        timestamp: expect.any(String)
      })
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        server: 'running',
        endpoints: 'available',
        linear: expect.objectContaining({
          configured: expect.any(Boolean),
          status: expect.any(String),
          message: expect.any(String)
        })
      })
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/health')
        .expect(204)

      expect(response.headers).toHaveProperty('access-control-allow-methods')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404)

      expect(response.text).toContain('Cannot GET /api/non-existent-endpoint')
    })

    it('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/newsletter/generate')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400)

      expect(response.body).toBeDefined()
    })
  })
})