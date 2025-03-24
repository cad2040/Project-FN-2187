module.exports = {
  testEnvironment: 'node',
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'server.js',
    'routes/**/*.js',
    'models/**/*.js',
    'utils/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFiles: ['<rootDir>/tests/setup.js']
}; 