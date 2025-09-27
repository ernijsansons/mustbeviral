module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    browser: true,
    es6: true,
    commonjs: true,
  },
  globals: {
    'console': 'readonly',
    'process': 'readonly',
    'require': 'readonly',
    'module': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'Buffer': 'readonly',
    'global': 'readonly',
  },
  rules: {
    // Allow console statements in Node.js environment
    'no-console': 'off',
    // Allow unused variables if they start with underscore
    '@typescript-eslint/no-unused-vars': [
      'error',
      { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    // Relax strict rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-unused-vars': 'off',
    'no-undef': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    '.wrangler/',
    'coverage/',
    '*.min.js',
    '*.d.ts',
    '__graveyard__/**/*', // Ignore archived files
  ],
};