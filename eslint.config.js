// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'babel.config.js',
      'metro.config.js',
    ],
  },
  {
    rules: {
      // Allow console for development (can be stricter in production)
      'no-console': 'warn',
      // React Native specific
      'react-native/no-inline-styles': 'off',
    },
  },
  // Jest test files configuration
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/__tests__/**/*', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
]);
