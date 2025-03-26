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

# Parse command line arguments
FORCE_REBUILD=false
for arg in "$@"; do
  case $arg in
    -f|--force)
      FORCE_REBUILD=true
      shift
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if sherpa-onnx is cloned
if [ ! -d "third_party/sherpa-onnx" ]; then
  echo -e "${RED}Error: sherpa-onnx repository not found. Run ./setup.sh first.${NC}"
  exit 1
fi

# Check if libraries already exist and we're not forcing a rebuild
if [ "$FORCE_REBUILD" = false ] && [ -d "prebuilt/ios" ] && [ "$(ls -A prebuilt/ios/*.a 2>/dev/null)" ]; then
  echo -e "${GREEN}Build artifacts already exist. Skipping rebuild.${NC}"
  echo -e "${YELLOW}Use -f or --force to rebuild anyway.${NC}"
  exit 0
fi

# Build for iOS
echo -e "${BLUE}Building for iOS...${NC}"
cd third_party/sherpa-onnx
./build-ios.sh
cd "$SCRIPT_DIR"

# Copy the built libraries for device (arm64)
mkdir -p prebuilt/ios/device
cp third_party/sherpa-onnx/build-ios/build/os64/lib/*.a prebuilt/ios/device/
cp third_party/sherpa-onnx/build-ios/build/os64/lib/*.dylib prebuilt/ios/device/ 2>/dev/null || true

# Copy the built libraries for simulator (arm64 + x86_64)
mkdir -p prebuilt/ios/simulator
cp third_party/sherpa-onnx/build-ios/build/simulator/lib/*.a prebuilt/ios/simulator/
cp third_party/sherpa-onnx/build-ios/build/simulator/lib/*.dylib prebuilt/ios/simulator/ 2>/dev/null || true

# Copy OnnxRuntime libraries - device
echo -e "${BLUE}Copying ONNX Runtime libraries...${NC}"
cp third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64/libonnxruntime.a prebuilt/ios/device/
cp -f third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64/onnxruntime.a prebuilt/ios/device/

# Copy OnnxRuntime libraries - simulator
echo -e "${BLUE}Copying ONNX Runtime libraries for simulator...${NC}"
cp third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64_x86_64-simulator/libonnxruntime.a prebuilt/ios/simulator/
cp -f third_party/sherpa-onnx/build-ios/ios-onnxruntime/1.17.1/onnxruntime.xcframework/ios-arm64_x86_64-simulator/onnxruntime.a prebuilt/ios/simulator/

# Also copy the combined sherpa-onnx.a files
echo -e "${BLUE}Copying combined sherpa-onnx libraries...${NC}"
cp third_party/sherpa-onnx/build-ios/build/os64/sherpa-onnx.a prebuilt/ios/device/
cp third_party/sherpa-onnx/build-ios/build/simulator/sherpa-onnx.a prebuilt/ios/simulator/

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