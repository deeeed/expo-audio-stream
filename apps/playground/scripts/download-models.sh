#!/bin/bash

# Change to the directory where the script is located
cd "$(dirname "$0")"

# Create assets directory if it doesn't exist
ASSETS_DIR="../assets"
mkdir -p "$ASSETS_DIR"

# Download models one by one
echo "Downloading ggml-tiny.en.bin..."
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin" -o "$ASSETS_DIR/ggml-tiny.en.bin"
if [ $? -ne 0 ]; then
    echo "✗ Failed to download ggml-tiny.en.bin"
    exit 1
fi
echo "✓ Successfully downloaded ggml-tiny.en.bin"

echo "Downloading ggml-base.bin..."
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" -o "$ASSETS_DIR/ggml-base.bin"
if [ $? -ne 0 ]; then
    echo "✗ Failed to download ggml-base.bin"
    exit 1
fi
echo "✓ Successfully downloaded ggml-base.bin"

echo "Downloading ggml-small.en-tdrz.bin..."
curl -L "https://huggingface.co/akashmjn/tinydiarize-whisper.cpp/resolve/main/ggml-small.en-tdrz.bin" -o "$ASSETS_DIR/ggml-small.en-tdrz.bin"
if [ $? -ne 0 ]; then
    echo "✗ Failed to download ggml-small.en-tdrz.bin"
    exit 1
fi
echo "✓ Successfully downloaded ggml-small.en-tdrz.bin"

echo "All models downloaded successfully to $ASSETS_DIR"
