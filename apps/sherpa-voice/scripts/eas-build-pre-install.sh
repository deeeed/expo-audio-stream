#!/bin/bash
# eas-build-pre-install.sh — runs during EAS build before native build starts
# Handles: corepack, yarn install, package builds, sherpa-onnx iOS prebuilt libs

set -e

echo "=== EAS pre-install: starting ==="

# 1. Enable corepack for yarn
corepack enable

# 2. Install monorepo dependencies
cd ../..
yarn install
echo "=== Dependencies installed ==="

# 3. Build required workspace packages
cd packages/audio-studio
yarn build
yarn build:plugin
echo "=== Built audio-studio ==="

# 4. Download sherpa-onnx prebuilt iOS libraries if missing
SHERPA_PKG="../../packages/sherpa-onnx.rn"
if [ ! -f "$SHERPA_PKG/prebuilt/ios/device/libonnxruntime.a" ]; then
  echo "=== Downloading sherpa-onnx prebuilt iOS libraries ==="
  RELEASE_TAG="sherpa-onnx-prebuilt-v1.12.28"
  ASSET_NAME="sherpa-onnx-ios-prebuilt.tar.gz"
  DOWNLOAD_URL="https://github.com/deeeed/audiolab/releases/download/${RELEASE_TAG}/${ASSET_NAME}"

  cd "$SHERPA_PKG"
  echo "Downloading from $DOWNLOAD_URL ..."
  curl -L -o "$ASSET_NAME" "$DOWNLOAD_URL"
  echo "Extracting..."
  tar xzf "$ASSET_NAME"
  rm -f "$ASSET_NAME"
  echo "=== sherpa-onnx iOS libraries installed ==="
else
  echo "=== sherpa-onnx iOS libraries already present, skipping download ==="
fi

echo "=== EAS pre-install: done ==="
