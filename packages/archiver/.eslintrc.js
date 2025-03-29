module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }],
    'prettier/prettier': [
      'error',
      {
        'quoteProps': 'consistent',
        'singleQuote': true,
        'tabWidth': 2,
        'trailingComma': 'es5',
        'useTabs': false
      }
    ]
  },
  overrides: [
    {
      // Apply TypeScript rules only to TypeScript files
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.lint.json',
        tsconfigRootDir: __dirname,
      }
    },
    {
      // JavaScript-specific configuration
      files: ['**/*.js', '**/*.cjs'],
      parser: null,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      }
    },
    {
      // Disable rules for placeholder/work-in-progress files
      files: ['**/WebArchiver.ts', '**/AndroidArchiver.ts', '**/IOSArchiver.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off'
      }
    },
    {
      // Relax rules for test files
      files: ['**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'lib/',
    'build/',
    'prebuilt/',
    'third_party/',
    'ios/build/',
    'android/build/',
    '**/*.d.ts',
    '.eslintrc.js',
    'app.plugin.js',
    'install.js',
    'example/',
    '*.config.js',
    'babel.config.js',
    'metro.config.js',
    'react-native.config.js'
  ]
};
