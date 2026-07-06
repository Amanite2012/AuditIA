/**
 * Configuration Jest — CDC section 9.3 :
 * couverture ≥ 80% sur la couche Business Logic (/features).
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/features/**/*.test.ts', '<rootDir>/ai/**/*.test.ts', '<rootDir>/utils/**/*.test.ts'],
  collectCoverageFrom: [
    'features/**/*.ts',
    'ai/**/*.ts',
    'utils/**/*.ts',
    '!features/testing/**',
    '!**/*.test.ts',
    '!**/*.types.ts',
  ],
  coverageThreshold: {
    'features/': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
