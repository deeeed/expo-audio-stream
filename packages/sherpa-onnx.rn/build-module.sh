#!/bin/bash

# This script builds the React Native module and fixes the dependency issues

# Make the script exit when an error occurs
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
ASSETS_DIR="$SCRIPT_DIR/assets"
PREBUILT_DIR="$SCRIPT_DIR/prebuilt"
THIRD_PARTY_DIR="$SCRIPT_DIR/third_party"

echo -e "${BLUE}Building sherpa-onnx.rn module${NC}"

# Step 1: Create lib directories if they don't exist
mkdir -p "$ANDROID_DIR/libs"

# Step 2: Build the sherpa-onnx AAR if needed
if [ -d "$THIRD_PARTY_DIR/sherpa-onnx" ]; then
  echo -e "${YELLOW}Building the sherpa-onnx AAR file${NC}"
  
  # Check if we need to build the AAR
  if [ ! -f "$ANDROID_DIR/libs/sherpa_onnx-release.aar" ]; then
    # Build the AAR if it doesn't exist
    cd "$THIRD_PARTY_DIR/sherpa-onnx/android/SherpaOnnxAar"
    
    echo -e "${YELLOW}Building the AAR...${NC}"
    ./gradlew clean assembleRelease
    
    # Copy the AAR to the libs directory
    if [ -f "sherpa_onnx/build/outputs/aar/sherpa_onnx-release.aar" ]; then
      cp sherpa_onnx/build/outputs/aar/sherpa_onnx-release.aar "$ANDROID_DIR/libs/"
      echo -e "${GREEN}Successfully built and copied the AAR file${NC}"
    else
      echo -e "${RED}Failed to build the AAR file${NC}"
      exit 1
    fi
    
    # Go back to the original directory
    cd "$SCRIPT_DIR"
  else
    echo -e "${GREEN}AAR file already exists${NC}"
  fi
else
  echo -e "${YELLOW}sherpa-onnx directory not found, skipping AAR build${NC}"
fi

# Step 3: Run the module's build script
echo -e "${YELLOW}Building the React Native module${NC}"
cd "$SCRIPT_DIR"
npm run prepare

# Step 4: Copy .so files to jniLibs
echo -e "${YELLOW}Copying .so files to jniLibs${NC}"
npm run copy:libs

echo -e "${GREEN}Done building the sherpa-onnx.rn module${NC}" 