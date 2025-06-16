// Mock implementation of node-fetch for testing
const fetch = jest.fn()

// Helper to create mock responses
fetch.mockResponse = (data, options = {}) => {
  return Promise.resolve({
    ok: options.ok !== false,
    status: options.status || 200,
    statusText: options.statusText || 'OK',
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    ...options
  })
}

// Helper to create error responses
fetch.mockReject = (error) => {
  return Promise.reject(error)
}

// Default mock implementation
fetch.mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '{}'
  })
})

module.exports = fetch
module.exports.default = fetch