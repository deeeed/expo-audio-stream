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
yarn build:clean

echo -e "${YELLOW}Starting publication process...${NC}"

# Check for git changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: There are uncommitted changes in the repository.${NC}"
    read -p "$(echo -e ${YELLOW}Do you want to proceed with --no-git-check? [y/N]: ${NC})" skip_git_check
    if [[ $skip_git_check =~ ^[Yy]$ ]]; then
        publisher release --no-git-check
    else
        echo -e "${BLUE}Please commit or stash your changes before proceeding.${NC}"
        exit 1
    fi
else
    publisher release
fi

# Get new version after bump
version=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $version${NC}"

# Ask about deploying storybook (default Yes)
read -p "$(echo -e ${YELLOW}Do you want to deploy the storybook? [Y/n]: ${NC})" deploy_storybook
if [[ $deploy_storybook =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Skipping storybook deployment${NC}"
else
    echo -e "${YELLOW}Deploying storybook...${NC}"
    yarn deploy:storybook
    echo -e "${BLUE}Storybook deployed successfully${NC}"
fi

echo -e "${GREEN}Publication process completed successfully!${NC}"