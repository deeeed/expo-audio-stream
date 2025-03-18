#!/bin/bash
set -e

echo "Setting up Essentia dependencies..."

# Create third_party directory if it doesn't exist
mkdir -p third_party

# Clone Essentia if it doesn't exist
if [ ! -d "third_party/essentia" ]; then
  echo "Cloning Essentia repository..."
  git clone --depth 1 --branch v2.1_beta5 https://github.com/MTG/essentia.git third_party/essentia
  # git clone --depth 1 --branch main https://github.com/MTG/essentia.git third_party/essentia

   # Apply iOS patch to the Essentia source
  echo "Applying iOS configuration patch..."
  cd third_party/essentia
  cp ../essentia_wscript_ios.patch .
  patch -p1 < ./essentia_wscript_ios.patch
else
  echo "Essentia source already exists."
fi

# Create include directory if it doesn't exist
mkdir -p cpp/include/essentia

# Copy essential Essentia headers to our include directory
# echo "Copying Essentia headers to include directory..."
# cp -r third_party/essentia/src/essentia/*.h cpp/include/essentia/

# Download dependencies like nlohmann/json
if [ ! -f "cpp/third_party/nlohmann/json.hpp" ]; then
  echo "Downloading nlohmann/json..."
  mkdir -p cpp/third_party/nlohmann
  curl -L https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -o cpp/third_party/nlohmann/json.hpp
fi

echo "Setup complete!"
