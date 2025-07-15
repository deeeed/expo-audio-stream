#!/bin/bash

# TypeScript type checking script that filters out node_modules errors
# 
# WHY THIS EXISTS:
# - @storybook/react-native-ui-common has TypeScript source files (.ts/.tsx) with strict mode violations
# - When we import storybook (via dynamic import in src/index.tsx), TypeScript follows the import chain
# - TypeScript's skipLibCheck only skips .d.ts files, NOT .ts/.tsx source files in node_modules
# - There's no way to prevent TypeScript from checking these files without excluding our own code
# - This script runs tsc normally but filters out any errors from node_modules
#
# This allows us to:
# - Keep strict TypeScript checking for our own code
# - Use dynamic imports for storybook (better code splitting)
# - Not be blocked by third-party TypeScript errors we can't control

# Run TypeScript compiler and capture output
output=$(npx tsc -p tsconfig.json --noEmit 2>&1)
exit_code=$?

# If no errors, exit successfully
if [ $exit_code -eq 0 ]; then
    echo "TypeScript check passed!"
    exit 0
fi

# Filter out node_modules errors
filtered_output=$(echo "$output" | grep -v "node_modules/")

# Check if we have any errors after filtering
if [ -z "$filtered_output" ] || ! echo "$filtered_output" | grep -q "error TS"; then
    echo "TypeScript check passed! (node_modules errors filtered out)"
    exit 0
else
    echo "$filtered_output"
    exit 1
fi 