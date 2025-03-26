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

# Copy OnnxRuntime libraries - this is the important addition
echo -e "${BLUE}Copying ONNX Runtime libraries...${NC}"
cp third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64/libonnxruntime.a prebuilt/ios/
cp -f third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64/onnxruntime.a prebuilt/ios/

# Copy headers with correct structure
mkdir -p prebuilt/include/sherpa-onnx/c-api
cp third_party/sherpa-onnx/sherpa-onnx/c-api/*.h prebuilt/include/sherpa-onnx/c-api/

# Copy ONNX Runtime headers
echo -e "${BLUE}Copying ONNX Runtime headers...${NC}"
mkdir -p prebuilt/include/onnxruntime
cp -R third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/Headers/* prebuilt/include/onnxruntime/

# Copy Swift API files
echo -e "${BLUE}Copying Swift API files...${NC}"
mkdir -p prebuilt/swift/sherpa-onnx
cp third_party/sherpa-onnx/swift-api-examples/SherpaOnnx.swift prebuilt/swift/sherpa-onnx/
cp third_party/sherpa-onnx/swift-api-examples/SherpaOnnx-Bridging-Header.h prebuilt/swift/sherpa-onnx/

# Create ios directory structure
mkdir -p ios/include/sherpa-onnx/c-api
cp third_party/sherpa-onnx/sherpa-onnx/c-api/*.h ios/include/sherpa-onnx/c-api/

echo -e "${GREEN}iOS libraries and Swift API files copied successfully!${NC}"