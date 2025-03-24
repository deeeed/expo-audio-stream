#!/bin/bash

# build-sherpa-android.sh
# Build Sherpa-onnx for Android platforms

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

# Build for Android arm64-v8a
echo -e "${BLUE}Building for Android arm64-v8a...${NC}"
cd third_party/sherpa-onnx
./build-android-arm64-v8a.sh
cd "$SCRIPT_DIR"

# Copy the built libraries
mkdir -p prebuilt/android/arm64-v8a
cp third_party/sherpa-onnx/build-android-arm64-v8a/install/lib/*.so prebuilt/android/arm64-v8a/

# Build for Android armeabi-v7a
echo -e "${BLUE}Building for Android armeabi-v7a...${NC}"
cd third_party/sherpa-onnx
./build-android-armv7-eabi.sh
cd "$SCRIPT_DIR"

# Copy the built libraries
mkdir -p prebuilt/android/armeabi-v7a
cp third_party/sherpa-onnx/build-android-armv7-eabi/install/lib/*.so prebuilt/android/armeabi-v7a/

# Build for Android x86_64
echo -e "${BLUE}Building for Android x86_64...${NC}"
cd third_party/sherpa-onnx
./build-android-x86-64.sh
cd "$SCRIPT_DIR"

# Copy the built libraries
mkdir -p prebuilt/android/x86_64
cp third_party/sherpa-onnx/build-android-x86-64/install/lib/*.so prebuilt/android/x86_64/

# Copy headers
mkdir -p prebuilt/include
cp -r third_party/sherpa-onnx/sherpa-onnx/c-api/*.h prebuilt/include/

echo -e "${GREEN}Android libraries built successfully!${NC}" 