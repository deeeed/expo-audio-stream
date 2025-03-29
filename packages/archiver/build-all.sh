#!/bin/bash

# build-all.sh
# Combined build script for @siteed/archiver

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Building @siteed/archiver...${NC}"

# Check if setup has been run
if [ ! -d "third_party/libarchive" ]; then
  echo -e "${YELLOW}Setup not completed. Running setup first...${NC}"
  ./setup.sh
fi

# Build the TypeScript code
echo -e "${YELLOW}Building TypeScript...${NC}"
yarn clean
yarn typecheck
yarn prepare

# Update the example project
echo -e "${YELLOW}Updating example project...${NC}"
cd example
yarn install
cd "$SCRIPT_DIR"

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}You can now run the example app:${NC}"
echo -e "${YELLOW}  cd example && yarn prebuild && yarn android${NC}"
echo -e "${YELLOW}  cd example && yarn prebuild && yarn ios${NC}"
