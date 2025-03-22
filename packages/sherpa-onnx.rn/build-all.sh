#!/bin/bash

# build-all.sh
# Build Sherpa-onnx for both iOS and Android

set -e

# Colors for terminal output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if force flag is provided
FORCE_ARG=""
if [ "$1" == "--force" ]; then
  FORCE_ARG="--force"
fi

echo -e "${BLUE}Building Sherpa-onnx for iOS...${NC}"
./build-sherpa-ios.sh $FORCE_ARG

echo -e "${BLUE}Building Sherpa-onnx for Android...${NC}"
./build-sherpa-android.sh $FORCE_ARG

echo -e "${GREEN}All builds completed successfully!${NC}" 