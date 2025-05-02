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
        'plugin:react-hooks/recommended',
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
        'promise',
        'react-hooks',
        'unused-imports',
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
        // Handle unused imports/variables
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'error',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'import/no-named-as-default': 'off',
        'import/no-named-as-default-member': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'error',
        // Allow require() for assets only
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': ['error', {
            allow: ['@assets/*']
        }],
        'max-len': ['warn', { 
            code: 200, 
            tabWidth: 4, 
            ignoreComments: true,
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreRegExpLiterals: true 
        }],
        'import/no-unresolved': [
            'error',
            {
                ignore: [
                    '^@siteed/expo-audio-ui',
                    '^onnxruntime-react-native'
                ]
            }
        ],
    },
}
