#!/bin/bash
set -e

# Define color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get absolute path of script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script directory: $SCRIPT_DIR"
cd "$SCRIPT_DIR"
echo -e "${BLUE}Changed to script directory: $(pwd)${NC}"

# Cleanup and rebuild first
echo -e "${YELLOW}Cleaning and rebuilding...${NC}"
yarn clean
yarn build
yarn build:plugin

echo -e "${YELLOW}Starting publication process...${NC}"
publisher release

# Get new version after bump
version=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $version${NC}"

# Ask about generating documentation (default Yes)
read -p "$(echo -e ${YELLOW}Do you want to generate updated documentation? [Y/n]: ${NC})" generate_docs
if [[ $generate_docs =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Skipping documentation generation${NC}"
else
    echo -e "${YELLOW}Generating updated documentation...${NC}"
    yarn docgen

    # Store the root directory path
    ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    cd "$ROOT_DIR/documentation_site"
    yarn build

    cd "$SCRIPT_DIR"

    sleep 2
    
    # Change to root directory before git operations
    cd "$ROOT_DIR"
    git add "docs" "documentation_site"
    git commit -m "docs: update api references for v$version"
    
    # Return to script directory
    cd "$SCRIPT_DIR"
    
    echo -e "${BLUE}Waiting while docs are generated...${NC}"
    sleep 2
fi

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

echo -e "${GREEN}Publication process completed successfully!${NC}"
