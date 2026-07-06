// Configuration ESLint — CDC section 9.3 : config React Native (expo)
// + règle no-console sur le code embarqué en production.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'coverage/**', 'dist/**', 'android/**', 'ios/**'],
  },
  {
    files: ['app/**', 'components/**', 'features/**', 'ai/**', 'db/**', 'store/**', 'utils/**', 'types/**'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.test.ts', 'features/testing/**'],
    rules: {
      'no-console': 'off',
    },
  },
]);
