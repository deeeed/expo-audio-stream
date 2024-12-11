#!/bin/bash
set -e

# Define color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to script's directory
cd "$(dirname "$0")"
echo -e "${BLUE}Changed to script directory: $(pwd)${NC}"

# Cleanup and rebuild first
echo -e "${YELLOW}Cleaning and rebuilding...${NC}"
yarn clean
yarn build
yarn build:plugin

# Update documentation
echo -e "${YELLOW}Generating updated documentation...${NC}"
yarn docgen

echo -e "${BLUE}Waiting while docs are generated...${NC}"
sleep 2

echo -e "${YELLOW}Starting publication process...${NC}"
publisher release

# Get new version after bump
version=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $version${NC}"

# Ask about deploying playground app
read -p "$(echo -e ${YELLOW}Do you want to deploy the playground app? [y/N]: ${NC})" deploy_playground
if [[ $deploy_playground =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Publishing playground app...${NC}"
    cd ../../apps/playground
    yarn deploy
fi

# Ask about deploying minimal app
read -p "$(echo -e ${YELLOW}Do you want to deploy the minimal app? [y/N]: ${NC})" deploy_minimal
if [[ $deploy_minimal =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Publishing minimal app...${NC}"
    cd ../minimal
    yarn deploy
fi

# Commit changes
echo -e "${YELLOW}Committing changes...${NC}"
git add "$(pwd)/../../" # add all changes in the root folder
git commit -m "feat: bump version to $version"

echo -e "${GREEN}Publication process completed successfully!${NC}"
