#!/bin/bash

# setup.sh
# Setup script for Sherpa-onnx React Native binding

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Sherpa-onnx React Native binding...${NC}"

# Check if necessary tools are installed
command -v git >/dev/null 2>&1 || { echo -e "${RED}Error: git is not installed.${NC}" >&2; exit 1; }
command -v cmake >/dev/null 2>&1 || { echo -e "${RED}Error: cmake is not installed.${NC}" >&2; exit 1; }
command -v make >/dev/null 2>&1 || { echo -e "${RED}Error: make is not installed.${NC}" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create directories
mkdir -p third_party
mkdir -p prebuilt

# Clone sherpa-onnx repository if not already present
if [ ! -d "third_party/sherpa-onnx" ]; then
  echo -e "${BLUE}Cloning sherpa-onnx repository...${NC}"
  git clone https://github.com/deeeed/sherpa-onnx third_party/sherpa-onnx
  cd third_party/sherpa-onnx
  git checkout webwasm
  cd "$SCRIPT_DIR"
else
  echo -e "${BLUE}Updating sherpa-onnx repository...${NC}"
  cd third_party/sherpa-onnx
  git pull origin webwasm
  cd "$SCRIPT_DIR"
fi

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}You can now build the libraries:${NC}"
echo -e "${YELLOW}  - For iOS: ./build-sherpa-ios.sh${NC}"
echo -e "${YELLOW}  - For Android: ./build-sherpa-android.sh${NC}"
echo -e "${YELLOW}  - For both: ./build-all.sh${NC}" 