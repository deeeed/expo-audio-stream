/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:promise/recommended',
        'plugin:react/recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'expo',
    ],
    ignorePatterns: ['build', 'node_modules', '.expo', 'dist', 'coverage', 'e2e/**/*'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // eslint-disable-next-line no-undef
        tsconfigRootDir: __dirname,
        project: './tsconfig.eslint.json',
    },
    plugins: [
        '@typescript-eslint',
        'prettier',
        'promise',
    ],
    settings: {
        react: {
            version: 'detect',
        },
        'import/resolver': {
            typescript: {
                project: './tsconfig.eslint.json',
            },
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                moduleDirectory: ['node_modules', '../../packages'],
            },
        },
    },
    rules: {
        // suppress errors for missing 'import React' in files
        'react/react-in-jsx-scope': 'off',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        'promise/catch-or-return': 'error',
        'promise/always-return': 'error',
        'promise/no-nesting': 'warn',
        'promise/no-promise-in-callback': 'warn',
        'promise/no-callback-in-promise': 'warn',
        'promise/no-new-statics': 'error',
        'promise/no-return-wrap': 'error',
        'promise/param-names': 'error',
        'promise/no-return-in-finally': 'warn',
        '@typescript-eslint/no-require-imports': ['error', {
            // Allow requires only for asset imports
            allow: ['@assets/*']
        }],
        '@typescript-eslint/no-var-requires': 'off',
        // TODO: Revisit these rules when onnxruntime-react-native provides better TypeScript support
        // Currently ignoring ESLint checks for onnxruntime-react-native due to missing type definitions
        'import/no-unresolved': [
            'error',
            {
                ignore: [
                    '^@siteed/expo-audio-ui',
                    '^onnxruntime-react-native'
                ]
            }
        ],
        'import/namespace': 'error',
    },
}
