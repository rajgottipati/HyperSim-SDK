module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
  testTimeout: 30000,
  reporters: [
    'default',
    ['<rootDir>/src/reporters/ConformanceReporter.ts', {
      outputFile: '../../reports/typescript-results.json'
    }]
  ]
};
