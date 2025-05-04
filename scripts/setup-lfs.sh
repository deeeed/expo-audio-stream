#!/bin/bash

echo "Setting up Git LFS for ONNX models..."

# Ensure Git LFS is installed
if ! command -v git-lfs &> /dev/null; then
    echo "Git LFS is not installed. Please install it first:"
    echo "Visit https://git-lfs.github.com/ for installation instructions"
    exit 1
fi

# Initialize Git LFS
git lfs install

# Create hooks directory
mkdir -p .githooks

# Create post-checkout hook
cat > .githooks/post-checkout << 'EOF'
#!/bin/bash
echo "Running post-checkout hook to pull LFS files..."
git lfs pull
EOF

# Create post-merge hook
cat > .githooks/post-merge << 'EOF'
#!/bin/bash
echo "Running post-merge hook to pull LFS files..."
git lfs pull
EOF

# Make hooks executable
chmod +x .githooks/post-checkout .githooks/post-merge

# Configure Git to use these hooks
git config core.hooksPath .githooks

# Pull LFS files now
echo "Pulling LFS files (ONNX models)..."
git lfs pull

echo "Git LFS setup complete! ONNX models should now be properly downloaded."
echo "If you still have issues with models showing as text pointers rather than binary files, please run: git lfs pull" 