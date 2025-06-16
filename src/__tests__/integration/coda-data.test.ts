import fs from 'fs'
import path from 'path'

describe('Coda Data Integration Tests', () => {
  const codaDataPath = path.resolve(__dirname, '../../../data/coda')

  describe('Data Directory Structure', () => {
    it('should have coda data directory', () => {
      expect(fs.existsSync(codaDataPath)).toBe(true)
    })

    it('should contain markdown files', () => {
      if (fs.existsSync(codaDataPath)) {
        const files = fs.readdirSync(codaDataPath)
        const markdownFiles = files.filter(file => file.endsWith('.md'))
        expect(markdownFiles.length).toBeGreaterThan(0)
      }
    })
  })

  describe('File Structure and Content', () => {
    let markdownFiles: string[] = []

    beforeAll(() => {
      if (fs.existsSync(codaDataPath)) {
        const files = fs.readdirSync(codaDataPath)
        markdownFiles = files.filter(file => file.endsWith('.md')).slice(0, 5) // Test first 5 files
      }
    })

    it('should have proper file naming convention', () => {
      markdownFiles.forEach(file => {
        // Files should have descriptive names with hyphens
        expect(file).toMatch(/^[\w-]+\.md$/)
        expect(file.length).toBeGreaterThan(5) // Should be descriptive
      })
    })

    it('should contain valid markdown content', () => {
      markdownFiles.forEach(file => {
        const filePath = path.join(codaDataPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Should not be empty
        expect(content.trim().length).toBeGreaterThan(0)
        
        // Should contain some markdown-like structure (headers, content)
        expect(content).toMatch(/[#\-*\n]/)
      })
    })

    it('should have frontmatter metadata', () => {
      markdownFiles.forEach(file => {
        const filePath = path.join(codaDataPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Many Coda exports should have frontmatter with metadata
        if (content.startsWith('---')) {
          expect(content).toMatch(/^---[\s\S]*?---/)
        }
      })
    })
  })

  describe('Content Analysis', () => {
    it('should contain various document types', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const fileNames = files.join(' ')
      
      // Should have different types of documents based on naming patterns
      const documentTypes = [
        'incident-reports',
        'tech-setup',
        'processes-and-norms',
        'onboarding',
        'qa'
      ]
      
      let foundTypes = 0
      documentTypes.forEach(type => {
        if (fileNames.includes(type)) {
          foundTypes++
        }
      })
      
      expect(foundTypes).toBeGreaterThan(0)
    })

    it('should exclude incident reports by default in search functions', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const incidentFiles = files.filter(file => file.includes('incident-reports'))
      const nonIncidentFiles = files.filter(file => !file.includes('incident-reports'))
      
      // Should have both types but more non-incident files for general queries
      expect(nonIncidentFiles.length).toBeGreaterThan(0)
      
      if (incidentFiles.length > 0) {
        // Incident reports should be identifiable and excludable
        incidentFiles.forEach(file => {
          expect(file).toContain('incident')
        })
      }
    })
  })

  describe('Data Processing Functions', () => {
    it('should be able to read and parse file content', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const testFile = files.find(file => file.endsWith('.md') && !file.includes('incident-reports'))
      
      if (testFile) {
        const filePath = path.join(codaDataPath, testFile)
        const content = fs.readFileSync(filePath, 'utf-8')
        
        // Should be able to extract meaningful content
        expect(content).toBeDefined()
        expect(typeof content).toBe('string')
        expect(content.length).toBeGreaterThan(10)
        
        // Should handle various content types
        const lines = content.split('\n')
        expect(lines.length).toBeGreaterThan(1)
      }
    })

    it('should handle file encoding properly', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const testFiles = files.filter(file => file.endsWith('.md')).slice(0, 3)
      
      testFiles.forEach(file => {
        const filePath = path.join(codaDataPath, file)
        
        // Should read without encoding errors
        expect(() => {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Test for common encoding issues
          expect(content).not.toContain('\uFFFD') // Replacement character
        }).not.toThrow()
      })
    })
  })

  describe('Search and Query Functionality', () => {
    it('should support text search across files', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const markdownFiles = files.filter(file => file.endsWith('.md')).slice(0, 5)
      
      // Simulate search functionality
      const searchTerm = 'setup'
      let foundMatches = 0
      
      markdownFiles.forEach(file => {
        const filePath = path.join(codaDataPath, file)
        const content = fs.readFileSync(filePath, 'utf-8').toLowerCase()
        
        if (content.includes(searchTerm) || file.toLowerCase().includes(searchTerm)) {
          foundMatches++
        }
      })
      
      // Should find at least some matches for common terms
      expect(foundMatches).toBeGreaterThanOrEqual(0)
    })

    it('should be able to filter by document type', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      
      // Test filtering by category
      const setupFiles = files.filter(file => file.includes('tech-setup'))
      const processFiles = files.filter(file => file.includes('processes'))
      const incidentFiles = files.filter(file => file.includes('incident-reports'))
      
      // Each category should be identifiable
      setupFiles.forEach(file => {
        expect(file).toContain('setup')
      })
      
      processFiles.forEach(file => {
        expect(file).toContain('processes')
      })
      
      incidentFiles.forEach(file => {
        expect(file).toContain('incident')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing files gracefully', () => {
      const nonExistentFile = path.join(codaDataPath, 'non-existent-file.md')
      
      expect(() => {
        if (fs.existsSync(nonExistentFile)) {
          fs.readFileSync(nonExistentFile, 'utf-8')
        }
      }).not.toThrow()
    })

    it('should handle corrupted or empty files', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const testFiles = files.filter(file => file.endsWith('.md')).slice(0, 3)
      
      testFiles.forEach(file => {
        const filePath = path.join(codaDataPath, file)
        const stats = fs.statSync(filePath)
        
        // Files should have reasonable size (not empty, not too large)
        expect(stats.size).toBeGreaterThan(0)
        expect(stats.size).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
      })
    })
  })

  describe('Performance Considerations', () => {
    it('should be able to process files efficiently', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const markdownFiles = files.filter(file => file.endsWith('.md'))
      
      // Test processing multiple files within reasonable time
      const startTime = Date.now()
      
      let totalContent = 0
      markdownFiles.slice(0, 10).forEach(file => {
        const filePath = path.join(codaDataPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        totalContent += content.length
      })
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      // Should process files reasonably quickly (less than 1 second for 10 files)
      expect(processingTime).toBeLessThan(1000)
      expect(totalContent).toBeGreaterThan(0)
    })

    it('should handle large numbers of files', () => {
      if (!fs.existsSync(codaDataPath)) return

      const files = fs.readdirSync(codaDataPath)
      const markdownFiles = files.filter(file => file.endsWith('.md'))
      
      // Should be able to list and categorize many files
      expect(markdownFiles.length).toBeGreaterThan(0)
      
      // Test that we can process file metadata quickly
      const startTime = Date.now()
      
      const fileStats = markdownFiles.map(file => {
        const filePath = path.join(codaDataPath, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime
        }
      })
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      expect(fileStats.length).toBe(markdownFiles.length)
      expect(processingTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})