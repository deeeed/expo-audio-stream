#!/usr/bin/env bash

# Set strict error handling
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print warning message
echo -e "${YELLOW}WARNING: This will remove all node_modules directories and yarn.lock files in the main, apps/, and packages/ directories${NC}"
echo -e "${YELLOW}This action cannot be undone!${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (y/N)${NC}"

# Read user input
read -r response

# Convert response to lowercase
response_lower=$(echo "$response" | tr '[:upper:]' '[:lower:]')

if [ "$response_lower" != "y" ]; then
    echo -e "${RED}Operation cancelled${NC}"
    exit 0
fi

echo -e "${GREEN}Starting cleanup...${NC}"

# Remove node_modules directories in the main, apps/, and packages/ directories
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules

# Remove yarn.lock files in the main, apps/, and packages/ directories
rm -f yarn.lock
rm -f apps/*/yarn.lock
rm -f packages/*/yarn.lock

echo -e "${GREEN}Cleanup completed. Running yarn install...${NC}"

# Run yarn install in the root directory
yarn install

echo -e "${GREEN}All done! Project has been cleaned and dependencies reinstalled.${NC}"