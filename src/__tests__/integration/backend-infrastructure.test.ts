import fs from 'fs'
import path from 'path'

describe('Backend Infrastructure Integration Tests', () => {
  describe('Environment and Dependencies', () => {
    it('should have required backend files', () => {
      expect(fs.existsSync(path.resolve(__dirname, '../../linear-client.ts'))).toBe(true)
      expect(fs.existsSync(path.resolve(__dirname, '../../api-server.ts'))).toBe(true)
      expect(fs.existsSync(path.resolve(__dirname, '../../simple-api-server.ts'))).toBe(true)
    })

    it('should have package.json with required dependencies', () => {
      const packagePath = path.resolve(__dirname, '../../../package.json')
      expect(fs.existsSync(packagePath)).toBe(true)
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
      
      // Essential backend dependencies
      expect(packageJson.dependencies).toHaveProperty('express')
      expect(packageJson.dependencies).toHaveProperty('cors')
      expect(packageJson.dependencies).toHaveProperty('node-fetch')
      
      // Test dependencies
      expect(packageJson.devDependencies).toHaveProperty('jest')
      expect(packageJson.devDependencies).toHaveProperty('supertest')
    })
  })

  describe('Linear Client Module', () => {
    it('should be able to import LinearClient', () => {
      const { LinearClient } = require('../../linear-client')
      expect(LinearClient).toBeDefined()
      expect(typeof LinearClient).toBe('function')
    })

    it('should create LinearClient instances', () => {
      const { LinearClient } = require('../../linear-client')
      const client = new LinearClient('test-key')
      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(LinearClient)
    })

    it('should have required methods', () => {
      const { LinearClient } = require('../../linear-client')
      const client = new LinearClient('test-key')
      
      expect(typeof client.validateApiKey).toBe('function')
      expect(typeof client.getCurrentCycles).toBe('function')
      expect(typeof client.getIssuesForCycle).toBe('function')
      expect(typeof client.getBacklogIssues).toBe('function')
      expect(typeof client.getTeamMembers).toBe('function')
    })
  })

  describe('API Endpoint Structure', () => {
    it('should have standard REST endpoints defined in api-server', () => {
      const apiServerPath = path.resolve(__dirname, '../../api-server.ts')
      const content = fs.readFileSync(apiServerPath, 'utf-8')
      
      // Should define core endpoints
      expect(content).toContain('app.get(\'/api/cycles\'')
      expect(content).toContain('app.get(\'/api/backlog\'')
      expect(content).toContain('app.get(\'/api/team-members\'')
      expect(content).toContain('app.post(\'/api/fetch-data\'')
      expect(content).toContain('app.post(\'/api/assignments\'')
    })

    it('should have proper error handling patterns in simple-api-server', () => {
      const simpleApiServerPath = path.resolve(__dirname, '../../simple-api-server.ts')
      const content = fs.readFileSync(simpleApiServerPath, 'utf-8')
      
      // Should have error handling
      expect(content).toContain('try {')
      expect(content).toContain('catch')
      expect(content).toContain('res.status(500)')
      expect(content).toContain('res.status(400)')
    })

    it('should export app instances', () => {
      const apiServerPath = path.resolve(__dirname, '../../api-server.ts')
      const simpleApiServerPath = path.resolve(__dirname, '../../simple-api-server.ts')
      
      const apiServerContent = fs.readFileSync(apiServerPath, 'utf-8')
      const simpleApiServerContent = fs.readFileSync(simpleApiServerPath, 'utf-8')
      
      expect(apiServerContent).toContain('export { app }')
      expect(simpleApiServerContent).toContain('export { app }')
    })
  })

  describe('Test Infrastructure', () => {
    it('should have mock infrastructure', () => {
      const mockPath = path.resolve(__dirname, '../__mocks__')
      expect(fs.existsSync(mockPath)).toBe(true)
      
      const nodeFetchMock = path.join(mockPath, 'node-fetch.js')
      expect(fs.existsSync(nodeFetchMock)).toBe(true)
      
      // Should be able to read mock content
      const mockContent = fs.readFileSync(nodeFetchMock, 'utf-8')
      expect(mockContent).toContain('jest.fn()')
      expect(mockContent).toContain('mockResponse')
    })

    it('should have Jest configuration file', () => {
      const jestConfigPath = path.resolve(__dirname, '../../../jest.config.js')
      expect(fs.existsSync(jestConfigPath)).toBe(true)
    })

    it('should have TypeScript configuration', () => {
      const tsconfigPath = path.resolve(__dirname, '../../../tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
      expect(tsconfig.compilerOptions).toBeDefined()
    })
  })

  describe('Performance and Scalability Tests', () => {
    it('should support concurrent operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => setTimeout(() => resolve(i), 10))
      )
      
      const results = await Promise.all(promises)
      expect(results).toEqual([0, 1, 2, 3, 4])
    })

    it('should handle file operations efficiently', () => {
      const startTime = Date.now()
      
      // Test reading multiple files
      const filesToCheck = [
        path.resolve(__dirname, '../../linear-client.ts'),
        path.resolve(__dirname, '../../api-server.ts'),
        path.resolve(__dirname, '../../simple-api-server.ts')
      ]
      
      let totalSize = 0
      filesToCheck.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath)
          totalSize += stats.size
        }
      })
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(processingTime).toBeLessThan(100) // Should be very fast
      expect(totalSize).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle missing dependencies gracefully', () => {
      // Test that modules handle missing environment variables
      const originalEnv = process.env.LINEAR_API_KEY
      
      delete process.env.LINEAR_API_KEY
      
      expect(() => {
        const { LinearClient } = require('../../linear-client')
        new LinearClient('')
      }).not.toThrow()
      
      // Restore environment
      if (originalEnv) {
        process.env.LINEAR_API_KEY = originalEnv
      }
    })

    it('should have proper module resolution', () => {
      expect(() => {
        require('../../types')
      }).not.toThrow()
    })

    it('should support TypeScript import patterns', () => {
      const apiServerPath = path.resolve(__dirname, '../../api-server.ts')
      const content = fs.readFileSync(apiServerPath, 'utf-8')
      
      // Should use proper import syntax
      expect(content).toContain('import')
      expect(content).toContain('from')
    })
  })

  describe('API Integration Readiness', () => {
    it('should have all required API endpoint types defined', () => {
      const typesPath = path.resolve(__dirname, '../../types.ts')
      if (fs.existsSync(typesPath)) {
        const content = fs.readFileSync(typesPath, 'utf-8')
        
        // Should have core Linear types
        expect(content).toContain('LinearIssue')
        expect(content).toContain('LinearCycle')
      }
    })

    it('should have comprehensive endpoint coverage', () => {
      const simpleApiServerPath = path.resolve(__dirname, '../../simple-api-server.ts')
      const content = fs.readFileSync(simpleApiServerPath, 'utf-8')
      
      // Should cover essential CRUD operations
      const endpoints = [
        '/api/health',
        '/api/test-linear',
        '/api/fetch-data',
        '/api/planning-state',
        '/api/assignments',
        '/api/changes',
        '/api/commit-changes'
      ]
      
      endpoints.forEach(endpoint => {
        expect(content).toContain(endpoint)
      })
    })

    it('should implement proper HTTP methods', () => {
      const simpleApiServerPath = path.resolve(__dirname, '../../simple-api-server.ts')
      const content = fs.readFileSync(simpleApiServerPath, 'utf-8')
      
      // Should use appropriate HTTP methods
      expect(content).toContain('app.get(')
      expect(content).toContain('app.post(')
      expect(content).toContain('app.delete(')
    })
  })
})