#!/bin/bash

# copy-libs.sh
# Copy prebuilt libraries to the correct location in the Android project

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$(dirname "$SCRIPT_DIR")"
PREBUILT_DIR="$MODULE_DIR/../prebuilt"
JNILIB_DIR="$MODULE_DIR/src/main/jniLibs"

# Create jniLibs directory structure
mkdir -p "$JNILIB_DIR/arm64-v8a"
mkdir -p "$JNILIB_DIR/armeabi-v7a"
mkdir -p "$JNILIB_DIR/x86_64"

# Check if prebuilt libraries exist
if [ ! -d "$PREBUILT_DIR/android" ]; then
  echo -e "${RED}Error: Prebuilt libraries not found. Run setup.sh and build-sherpa-android.sh first.${NC}"
  exit 1
fi

# Copy libraries
echo -e "${BLUE}Copying libraries to jniLibs directory...${NC}"

# arm64-v8a
echo -e "${YELLOW}Copying arm64-v8a libraries...${NC}"
cp -f "$PREBUILT_DIR/android/arm64-v8a/"*.so "$JNILIB_DIR/arm64-v8a/" || {
  echo -e "${RED}Failed to copy arm64-v8a libraries${NC}"
  exit 1
}

# armeabi-v7a
echo -e "${YELLOW}Copying armeabi-v7a libraries...${NC}"
cp -f "$PREBUILT_DIR/android/armeabi-v7a/"*.so "$JNILIB_DIR/armeabi-v7a/" || {
  echo -e "${RED}Failed to copy armeabi-v7a libraries${NC}"
  exit 1
}

# x86_64
echo -e "${YELLOW}Copying x86_64 libraries...${NC}"
cp -f "$PREBUILT_DIR/android/x86_64/"*.so "$JNILIB_DIR/x86_64/" || {
  echo -e "${RED}Failed to copy x86_64 libraries${NC}"
  exit 1
}

echo -e "${GREEN}Libraries copied successfully!${NC}" 