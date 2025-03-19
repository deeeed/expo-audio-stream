#!/bin/bash
set -e

# Change to the script's directory
cd "$(dirname "$0")"

echo "Setting up Essentia dependencies..."

# Create third_party directory if it doesn't exist
mkdir -p third_party

# Clone Essentia if it doesn't exist
if [ ! -d "third_party/essentia" ]; then
  echo "Cloning Essentia repository..."
  git clone --branch v2.1_beta5 https://github.com/MTG/essentia.git third_party/essentia

  # Below fork includes the c++11 patch to make it compatible with c++17
  # https://github.com/wo80/essentia/commit/4c27b35fd0f06d58f4e4d4463e2467596d76ee9b#diff-2413d77f2a9daaf40336b81295762b2a8c79c242d1eb05e140b96b21315cd2c0
  # git clone --depth 1 https://github.com/wo80/essentia third_party/essentia

  # git clone --depth 1 --branch main https://github.com/MTG/essentia.git third_party/essentia

   # Apply iOS patch to the Essentia source
  echo "Applying iOS configuration patch..."
  cd third_party/essentia
  cp ../essentia_wscript_ios.patch .
  cp ../essentia_c++17.patch .
  patch -p1 < ./essentia_wscript_ios.patch
  patch -p1 < ./essentia_c++17.patch
else
  echo "Essentia source already exists."
fi

# Clone essentia.js if it doesn't exist
if [ ! -d "third_party/essentia.js" ]; then
  echo "Cloning Essentia.js repository..."
  git clone --depth 1 https://github.com/MTG/essentia.js.git third_party/essentia.js
else
  echo "Essentia.js source already exists."
fi

# Create include directory if it doesn't exist
mkdir -p cpp/include/essentia

# Copy essential Essentia headers to our include directory
echo "Copying Essentia headers to include directory..."
if [ -d "third_party/essentia/src/essentia" ]; then
  # Use find to copy all .h files, preserving directory structure
  find third_party/essentia/src/essentia -name "*.h" -type f | while read file; do
    rel_path=${file#third_party/essentia/src/}
    target_dir="cpp/include/$(dirname "$rel_path")"
    mkdir -p "$target_dir"
    if [ ! -f "cpp/include/$rel_path" ] || [ "$file" -nt "cpp/include/$rel_path" ]; then
      cp "$file" "cpp/include/$rel_path"
      echo "Copied: $rel_path"
    else
      echo "Skipped (unchanged): $rel_path"
    fi
  done
else
  echo "Error: Essentia source directory not found!"
  exit 1
fi

# Download dependencies like nlohmann/json
if [ ! -f "cpp/third_party/nlohmann/json.hpp" ]; then
  echo "Downloading nlohmann/json..."
  mkdir -p cpp/third_party/nlohmann
  curl -L https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -o cpp/third_party/nlohmann/json.hpp
fi

echo "Setup complete!"
