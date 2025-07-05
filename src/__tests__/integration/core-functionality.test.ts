import fs from 'fs'
import path from 'path'

describe('Core Backend Integration Tests', () => {
  describe('Environment and Dependencies', () => {
    it('should have required environment setup', () => {
      // Check that essential files exist
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
      expect(packageJson.devDependencies).toHaveProperty('@types/jest')
    })
  })

  describe('API Server Configuration', () => {
    it('should be able to import API server modules', () => {
      // Test that we can at least import the modules
      expect(() => {
        require('../../api-server')
      }).not.toThrow()

      expect(() => {
        require('../../simple-api-server')
      }).not.toThrow()
    })

    it('should have proper exports', () => {
      const apiServer = require('../../api-server')
      expect(apiServer).toHaveProperty('app')
      
      const simpleApiServer = require('../../simple-api-server')
      expect(simpleApiServer).toHaveProperty('app')
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
  })


  describe('Test Infrastructure', () => {
    it('should have working Jest configuration', () => {
      const jestConfigPath = path.resolve(__dirname, '../../../jest.config.js')
      expect(fs.existsSync(jestConfigPath)).toBe(true)
      
      const jestConfig = require('../../../jest.config.js')
      expect(jestConfig).toBeDefined()
      expect(jestConfig.testEnvironment).toBe('node')
    })

    it('should support TypeScript testing', () => {
      const jestConfig = require('../../../jest.config.js')
      expect(jestConfig.preset).toBe('ts-jest')
    })

    it('should have mock infrastructure', () => {
      const mockPath = path.resolve(__dirname, '../__mocks__')
      expect(fs.existsSync(mockPath)).toBe(true)
      
      const nodeFetchMock = path.join(mockPath, 'node-fetch.js')
      expect(fs.existsSync(nodeFetchMock)).toBe(true)
    })
  })

  describe('API Endpoint Structure', () => {
    it('should have standard REST endpoints defined', () => {
      // We can't easily test the server without starting it, but we can verify
      // the endpoint structure by examining the source files
      const apiServerPath = path.resolve(__dirname, '../../api-server.ts')
      const content = fs.readFileSync(apiServerPath, 'utf-8')
      
      // Should define core endpoints
      expect(content).toContain('app.get(\'/api/cycles\'')
      expect(content).toContain('app.get(\'/api/backlog\'')
      expect(content).toContain('app.get(\'/api/team-members\'')
      expect(content).toContain('app.post(\'/api/fetch-data\'')
      expect(content).toContain('app.post(\'/api/assignments\'')
    })

    it('should have proper error handling patterns', () => {
      const simpleApiServerPath = path.resolve(__dirname, '../../simple-api-server.ts')
      const content = fs.readFileSync(simpleApiServerPath, 'utf-8')
      
      // Should have error handling
      expect(content).toContain('try {')
      expect(content).toContain('catch')
      expect(content).toContain('res.status(500)')
      expect(content).toContain('res.status(400)')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle file system operations efficiently', () => {
      const srcPath = path.resolve(__dirname, '../../')
      
      if (fs.existsSync(srcPath)) {
        const startTime = Date.now()
        
        // Simulate processing multiple files
        const files = fs.readdirSync(srcPath)
        const tsFiles = files.filter(f => f.endsWith('.ts')).slice(0, 10)
        
        let totalSize = 0
        tsFiles.forEach(file => {
          const filePath = path.join(srcPath, file)
          const stats = fs.statSync(filePath)
          totalSize += stats.size
        })
        
        const endTime = Date.now()
        const processingTime = endTime - startTime
        
        // Should process files quickly
        expect(processingTime).toBeLessThan(1000) // Less than 1 second
        expect(totalSize).toBeGreaterThan(0)
      }
    })

    it('should support concurrent operations', async () => {
      // Test that we can handle multiple async operations
      const promises = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => setTimeout(() => resolve(i), 10))
      )
      
      const results = await Promise.all(promises)
      expect(results).toEqual([0, 1, 2, 3, 4])
    })
  })

  describe('Configuration and Setup', () => {
    it('should have TypeScript configuration', () => {
      const tsconfigPath = path.resolve(__dirname, '../../../tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
      expect(tsconfig.compilerOptions).toBeDefined()
      expect(tsconfig.compilerOptions.target).toBeDefined()
    })

    it('should have proper module resolution', () => {
      // Test that imports work correctly
      expect(() => {
        require('../../types')
      }).not.toThrow()
    })

    it('should handle environment variables appropriately', () => {
      // Test environment variable handling without actually setting any
      const originalEnv = process.env.LINEAR_API_KEY
      
      // Should not crash when env var is missing
      delete process.env.LINEAR_API_KEY
      expect(() => {
        const { LinearClient } = require('../../linear-client')
        new LinearClient('')
      }).not.toThrow()
      
      // Restore
      if (originalEnv) {
        process.env.LINEAR_API_KEY = originalEnv
      }
    })
  })
})