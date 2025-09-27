const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '.next/',
      'out/',
      'mustbeviral/node_modules/',
      'mustbeviral/dist/',
      'mustbeviral/build/',
      'mustbeviral/coverage/',
      'mustbeviral/.next/',
      'mustbeviral/out/',
      '__graveyard__/**/*',
      'scripts/**/*',
      '**/*.min.js',
      '**/*.d.ts',
      '**/vendor/**',
      '**/.jest-cache/**',
      // Add .eslintignore content
      'load-tests/',
      'monitoring/',
      'docker/',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/*.test.js',
      '**/*.test.ts',
      // Ignore Storybook files due to JSX in .ts files
      'mustbeviral/.storybook/**',
    ],
  },
  // JavaScript files configuration
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-debugger': 'error',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-undef': 'off',
      'no-dupe-keys': 'error',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
    },
  },
  // TypeScript files configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['./tsconfig.json', './mustbeviral/tsconfig.json'],
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-vars': 'off', // Use TypeScript version instead
      'no-undef': 'off', // TypeScript handles this
      'no-console': 'off',
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
    },
  },
  // CommonJS files
  {
    files: ['**/*.cjs', 'jest.config.js', 'babel.config.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];