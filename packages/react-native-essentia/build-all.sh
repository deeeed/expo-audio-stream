#!/bin/bash
set -e

# Check if force flag is provided
FORCE_FLAG=""
if [ "$1" == "--force" ]; then
  FORCE_FLAG="--force"
fi

# Run setup first if third_party/essentia doesn't exist
if [ ! -d "third_party/essentia" ]; then
  echo "Running setup script first..."
  ./setup.sh
fi

# Build for iOS
echo "Building for iOS..."
./build-essentia-ios.sh $FORCE_FLAG

# Build for Android
echo "Building for Android..."
./build-essentia-android.sh --all $FORCE_FLAG

echo "Build completed for all platforms!"