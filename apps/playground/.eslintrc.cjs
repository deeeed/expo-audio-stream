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
        'universe/native',
        'universe/web',
        'plugin:promise/recommended',
        'plugin:react/recommended',
        'prettier',
    ],
    ignorePatterns: ['build', 'node_modules', 'dist', 'coverage'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // eslint-disable-next-line no-undef
        tsconfigRootDir: __dirname,
        project: './tsconfig.eslint.json',
    },
    plugins: ['@typescript-eslint', 'prettier', 'promise'],
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
    },
}
