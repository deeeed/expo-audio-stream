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

# Rebuild first
echo -e "${YELLOW}Building...${NC}"
yarn prepare

# Verify WASM files exist for npm tarball
if [ ! -f wasm/sherpa-onnx-wasm-combined.wasm ]; then
  echo -e "${YELLOW}Error: wasm/ directory missing. Run ./build-sherpa-wasm.sh --combined first.${NC}"
  exit 1
fi

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

# jsDelivr auto-serves WASM files from the npm tarball — no separate upload needed.
echo -e "${GREEN}Publication process completed successfully!${NC}"
echo -e "${BLUE}WASM runtime will be available at: https://cdn.jsdelivr.net/npm/@siteed/sherpa-onnx.rn@${version}/wasm/${NC}"
