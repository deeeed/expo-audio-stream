#!/bin/bash

# build-sherpa-ios.sh
# Build Sherpa-onnx for iOS platforms

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if sherpa-onnx is cloned
if [ ! -d "third_party/sherpa-onnx" ]; then
  echo -e "${RED}Error: sherpa-onnx repository not found. Run ./setup.sh first.${NC}"
  exit 1
fi

# Build for iOS
echo -e "${BLUE}Building for iOS...${NC}"
cd third_party/sherpa-onnx
./build-ios.sh
cd "$SCRIPT_DIR"

# Copy the built libraries
mkdir -p prebuilt/ios
cp third_party/sherpa-onnx/build-ios/install/lib/*.a prebuilt/ios/
cp third_party/sherpa-onnx/build-ios/install/lib/*.dylib prebuilt/ios/ 2>/dev/null || true

# Copy headers
mkdir -p prebuilt/include
cp -r third_party/sherpa-onnx/sherpa-onnx/c-api/*.h prebuilt/include/

echo -e "${GREEN}iOS libraries built successfully!${NC}" 