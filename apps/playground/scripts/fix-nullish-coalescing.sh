#!/bin/bash

# Fix nullish coalescing and optional chaining issues
echo "Fixing nullish coalescing and optional chaining issues..."

# Extract list of files with issues
npx eslint src/ --format=json > eslint-report.json

# Count issues by type
NULLISH_COUNT=$(grep -c "prefer-nullish-coalescing" eslint-report.json)
OPTIONAL_COUNT=$(grep -c "prefer-optional-chain" eslint-report.json)

echo "Found issues:"
echo "- $NULLISH_COUNT nullish coalescing issues"
echo "- $OPTIONAL_COUNT optional chaining issues"
echo ""
echo "These issues need to be fixed manually. Here are some common patterns:"
echo ""
echo "For nullish coalescing:"
echo "  Old: const value = someValue || defaultValue;"
echo "  New: const value = someValue ?? defaultValue;"
echo ""
echo "For optional chaining:"
echo "  Old: if (obj && obj.prop && obj.prop.method) {"
echo "  New: if (obj?.prop?.method) {"
echo ""
echo "See LINTING_SETUP.md for more examples and guidance."
echo ""

# Clean up
rm eslint-report.json

echo "Done! You can run this script any time with 'yarn lint:fix-nullish'" 