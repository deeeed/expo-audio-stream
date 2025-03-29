# Linting and TypeScript Configuration

This project uses ESLint and TypeScript for code quality. The configuration has been set up to handle different environments including development, testing, and production builds.

## Configuration Files

- **tsconfig.json**: Base TypeScript configuration for development
- **tsconfig.build.json**: TypeScript configuration for production builds
- **tsconfig.lint.json**: TypeScript configuration specifically for linting
- **.eslintrc.js**: ESLint configuration for TypeScript files
- **.eslintrc.cjs**: ESLint configuration for JavaScript files
- **.eslintignore**: Files to ignore in ESLint
- **.typescriptignore**: Files to ignore in TypeScript

## Available Scripts

```bash
# Run TypeScript type checking
yarn typecheck

# Run TypeScript type checking for production build
yarn typecheck:build

# Run ESLint on TypeScript files only
yarn lint:ts

# Run ESLint on JavaScript files only
yarn lint:js

# Run ESLint on all files
yarn lint

# Fix ESLint issues automatically where possible
yarn lint:fix
```

## Pre-commit Hooks

The project uses Lefthook for pre-commit hooks. When you commit code:

1. ESLint will run on staged TypeScript files in the src directory
2. TypeScript type checking will run on staged TypeScript files in the src directory

To temporarily bypass the pre-commit hooks:

```bash
git commit -m "your message" --no-verify
```

## Handling Third-Party Code

Third-party code and generated files are excluded from linting:

- Files in `node_modules/`, `lib/`, `build/`, `prebuilt/`, `third_party/` directories
- All `.d.ts` declaration files
- The `js-untar.d.ts` types file
- Configuration files and examples

## TypeScript Variable Conventions

- Use underscore prefix (`_variableName`) for class variables that are currently unused but will be used in the future
- This prevents linting errors while keeping the code ready for future implementation

## Troubleshooting

If you encounter linting errors:

1. Run `yarn lint:fix` to automatically fix simple issues
2. For TypeScript errors related to shared objects on React Native, add the type to the interface in `src/index.ts`
3. For third-party code issues, ensure the file is properly excluded in the appropriate ESLint configuration

### TypeScript Version Compatibility

If you see a warning about TypeScript version compatibility with typescript-eslint, you can safely ignore it for now. The configuration has been set up to work with newer TypeScript versions by:

1. Only applying the TypeScript parser to .ts and .tsx files
2. Using skipLibCheck to avoid issues with third-party type definitions
3. Properly excluding files that are not relevant for linting

## Adding New Files

When adding new files:

1. Follow the existing code style
2. For placeholder implementations, prefix unused variables with underscore
3. Add appropriate JSDoc comments for public functions
4. JavaScript files should be properly formatted according to the project's conventions

## Version Compatibility

The project is configured to work with:
- TypeScript 5.2.0+
- ESLint 8.51.0+
- React Native 0.78.1+
