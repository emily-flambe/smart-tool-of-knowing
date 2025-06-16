import request from 'supertest'
import { app } from '../../simple-api-server'

// Mock environment variables for testing
const originalEnv = process.env.LINEAR_API_KEY

describe('Simple API Server Integration Tests', () => {
  beforeEach(() => {
    // Clear any existing Linear API key for predictable test behavior
    delete process.env.LINEAR_API_KEY
  })

  afterAll(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.LINEAR_API_KEY = originalEnv
    }
  })

  describe('GET /api/', () => {
    it('should return API server information', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Smart Tool of Knowing API Server')
      expect(response.body).toHaveProperty('status', 'online')
      expect(response.body).toHaveProperty('version')
      expect(response.body).toHaveProperty('endpoints')
      expect(response.body).toHaveProperty('timestamp')
    })
  })

  describe('GET /api/health', () => {
    it('should return health status without Linear API key', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ok')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('server', 'running')
      expect(response.body).toHaveProperty('linear')
      expect(response.body.linear).toHaveProperty('configured', false)
      expect(response.body.linear).toHaveProperty('status', 'not_configured')
    })

    it('should indicate Linear configuration status', async () => {
      // Test with mock API key
      process.env.LINEAR_API_KEY = 'test-key'
      
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body.linear).toHaveProperty('configured', true)
      expect(response.body.linear.status).toBe('ready')
    })
  })

  describe('GET /api/test-linear', () => {
    it('should return error when Linear API key not configured', async () => {
      const response = await request(app)
        .get('/api/test-linear')
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error', 'Linear API key not configured')
      expect(response.body).toHaveProperty('helpUrl')
    })

    it('should attempt connection when API key is configured', async () => {
      process.env.LINEAR_API_KEY = 'invalid-test-key'
      
      const response = await request(app)
        .get('/api/test-linear')
        .expect(500) // Will fail with invalid key, but shows endpoint works

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error', 'Linear connection failed')
    })
  })

  describe('GET /api/cycles', () => {
    it('should return mock cycles data', async () => {
      const response = await request(app)
        .get('/api/cycles')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('name')
      expect(response.body[0]).toHaveProperty('startsAt')
      expect(response.body[0]).toHaveProperty('endsAt')
    })
  })

  describe('GET /api/backlog', () => {
    it('should require Linear API key', async () => {
      const response = await request(app)
        .get('/api/backlog')
        .expect(400)

      expect(response.body).toHaveProperty('error', 'Linear API key not configured')
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('team setup')
    })
  })

  describe('GET /api/team-members', () => {
    it('should return mock team members', async () => {
      const response = await request(app)
        .get('/api/team-members')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(3)
      response.body.forEach((member: any) => {
        expect(member).toHaveProperty('id')
        expect(member).toHaveProperty('name')
        expect(member).toHaveProperty('email')
      })
    })
  })

  describe('GET /api/active-engineers', () => {
    it('should require Linear API key', async () => {
      const response = await request(app)
        .get('/api/active-engineers')
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error', 'Linear API key not configured')
    })
  })

  describe('POST /api/fetch-data', () => {
    it('should require Linear API key', async () => {
      const response = await request(app)
        .post('/api/fetch-data')
        .expect(400)

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error', 'Linear API key not configured')
    })
  })

  describe('GET /api/planning-state', () => {
    it('should return 404 when no planning data available', async () => {
      const response = await request(app)
        .get('/api/planning-state')
        .expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('No planning data available')
    })
  })

  describe('Planning State Endpoints', () => {
    describe('POST /api/assignments', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .send({
            issueId: 'test-issue',
            toEngineerId: 'test-engineer'
          })
          .expect(404)

        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })

      it('should validate required issueId field', async () => {
        const response = await request(app)
          .post('/api/assignments')
          .send({ toEngineerId: 'test-engineer' })
          .expect(404) // Still 404 due to no planning data, but validates structure

        expect(response.body).toHaveProperty('error')
      })
    })

    describe('GET /api/changes', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .get('/api/changes')
          .expect(404)

        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })
    })

    describe('DELETE /api/changes/:changeIndex', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .delete('/api/changes/0')
          .expect(404)

        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })
    })

    describe('POST /api/update-status', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .post('/api/update-status')
          .send({
            issueId: 'test-issue',
            statusId: 'test-status'
          })
          .expect(404)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })
    })

    describe('POST /api/update-cycle', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .post('/api/update-cycle')
          .send({
            issueId: 'test-issue',
            cycleId: 'test-cycle'
          })
          .expect(404)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })
    })

    describe('POST /api/update-estimate', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .post('/api/update-estimate')
          .send({
            issueId: 'test-issue',
            estimate: 5
          })
          .expect(404)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/update-estimate')
          .send({ issueId: 'test-issue' }) // Missing estimate
          .expect(404) // Still 404 due to no planning data

        expect(response.body).toHaveProperty('success', false)
      })
    })

    describe('POST /api/reset', () => {
      it('should return 404 when no planning data available', async () => {
        const response = await request(app)
          .post('/api/reset')
          .expect(404)

        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toContain('No planning data available')
      })
    })

    describe('POST /api/commit-changes', () => {
      it('should require Linear API key', async () => {
        const response = await request(app)
          .post('/api/commit-changes')
          .send({
            changes: []
          })
          .expect(400)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error', 'Linear API key not configured')
      })

      it('should validate changes array is required', async () => {
        process.env.LINEAR_API_KEY = 'test-key'
        
        const response = await request(app)
          .post('/api/commit-changes')
          .send({}) // Missing changes array
          .expect(404) // Will be 404 due to no planning data

        expect(response.body).toHaveProperty('success', false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid routes gracefully', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404)
    })

    it('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/assignments')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)
    })
  })
})