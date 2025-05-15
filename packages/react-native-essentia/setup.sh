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

  # Change directory to the cloned repository
  cd third_party/essentia

  # Apply patches
  echo "Applying iOS configuration patch..."
  cp ../essentia_wscript_ios.patch .
  cp ../essentia_c++17.patch .
  patch -p1 < ./essentia_wscript_ios.patch
  patch -p1 < ./essentia_c++17.patch

  # Return to the original directory
  cd ../../
else
  echo "Essentia source already exists."
fi

# Important: Reset the working directory to the script's directory
cd "$(dirname "$0")"

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

# Create version.h file
echo "Creating version.h file..."
mkdir -p cpp/include/essentia
cat > cpp/include/essentia/version.h << EOL
#ifndef VERSION_H_
#define VERSION_H_
#define ESSENTIA_VERSION "2.1-beta5"
#define ESSENTIA_GIT_SHA "v2.1_beta5-dirty"
#endif /* VERSION_H_ */
EOL

# Download dependencies like nlohmann/json
if [ ! -f "cpp/third_party/nlohmann/json.hpp" ]; then
  echo "Downloading nlohmann/json..."
  mkdir -p cpp/third_party/nlohmann
  curl -L https://github.com/nlohmann/json/releases/download/v3.11.2/json.hpp -o cpp/third_party/nlohmann/json.hpp
fi

echo "Setup complete!"
