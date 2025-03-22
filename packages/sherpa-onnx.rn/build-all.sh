#!/bin/bash

# build-all.sh
# Build Sherpa-onnx for all platforms (iOS and Android)

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Building Sherpa-onnx for all platforms...${NC}"

# Build for iOS
echo -e "${YELLOW}Building for iOS...${NC}"
./build-sherpa-ios.sh

# Build for Android
echo -e "${YELLOW}Building for Android...${NC}"
./build-sherpa-android.sh

echo -e "${GREEN}All libraries built successfully!${NC}"
echo -e "${BLUE}Libraries can be found in:${NC}"
echo -e "${YELLOW}  - iOS: prebuilt/ios/${NC}"
echo -e "${YELLOW}  - Android: prebuilt/android/{arm64-v8a,armeabi-v7a,x86_64}/${NC}" 