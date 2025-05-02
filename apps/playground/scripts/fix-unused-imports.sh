#!/bin/bash

# Fix unused imports
echo "Cleaning up unused imports..."
npx eslint src/ --fix --quiet --rule 'unused-imports/no-unused-imports: error'

echo "Done! You can run this script any time with 'yarn lint:fix-imports'" 