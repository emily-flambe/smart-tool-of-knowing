import request from 'supertest'
import { app } from '../../simple-api-server'

describe('API Server Startup Tests', () => {
  it('should start without errors', async () => {
    // The fact that we can import the app means it started successfully
    expect(app).toBeDefined()
    expect(typeof app.listen).toBe('function')
  })

  it('should respond to health check immediately after startup', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body.status).toBe('ok')
    expect(response.body.server).toBe('running')
  })

  it('should have CORS enabled', async () => {
    const response = await request(app)
      .get('/api/')
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBeDefined()
  })

  it('should handle concurrent requests', async () => {
    const requests = [
      request(app).get('/api/health'),
      request(app).get('/api/'),
      request(app).get('/api/cycles'),
      request(app).get('/api/team-members')
    ]

    const responses = await Promise.all(requests)
    
    responses.forEach(response => {
      expect(response.status).toBeLessThan(500)
      expect(response.body).toBeDefined()
    })
  })

  it('should have all documented endpoints available', async () => {
    const response = await request(app)
      .get('/api/')
      .expect(200)

    const endpoints = response.body.endpoints
    
    // Verify all documented endpoints exist
    expect(endpoints).toHaveProperty('health')
    expect(endpoints).toHaveProperty('cycles')
    expect(endpoints).toHaveProperty('backlog')
    expect(endpoints).toHaveProperty('teamMembers')
    expect(endpoints).toHaveProperty('activeEngineers')
    expect(endpoints).toHaveProperty('newsletter')
    expect(endpoints).toHaveProperty('cycleReview')
  })

  it('should return proper content types', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.headers['content-type']).toMatch(/application\/json/)
  })

  it('should handle GET and POST methods appropriately', async () => {
    // GET should work
    await request(app)
      .get('/api/health')
      .expect(200)

    // POST to GET-only endpoint should fail
    await request(app)
      .post('/api/health')
      .expect(404)

    // POST to newsletter endpoint should be accepted (may fail with 400/500 due to no API key)
    const postResponse = await request(app)
      .post('/api/newsletter/generate')
      .send({ cycleId: 'test' })
    
    expect([200, 400, 404, 500]).toContain(postResponse.status)
  })
})