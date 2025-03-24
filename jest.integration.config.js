module.exports = {
  testEnvironment: 'node',
  coverageDirectory: './coverage/integration',
  collectCoverageFrom: [
    'server.js',
    'routes/**/*.js',
    'models/**/*.js',
    'utils/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: ['**/tests/integration.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports',
      outputName: 'integration-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
}; 