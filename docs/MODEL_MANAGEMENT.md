# ONNX Model Management with Git LFS

This project uses [Git Large File Storage (LFS)](https://git-lfs.github.com/) to manage ONNX model files. These large binary files need special handling to avoid bloating the repository.

## Setup for New Team Members

When you first clone the repository, run the setup script to configure Git LFS properly:

```bash
# Make the script executable if needed
chmod +x scripts/setup-lfs.sh

# Run the setup script
./scripts/setup-lfs.sh
```

This script will:
1. Verify Git LFS is installed on your system
2. Set up automatic Git LFS pulls after checkout/merge operations
3. Pull all LFS files immediately

## Troubleshooting Model Files

If your ONNX models are showing as text files with content like `version https://git-lfs.github.com/spec/v1` instead of actual binary content, it means Git LFS is not properly pulling the files. Run:

```bash
git lfs pull
```

## ONNX Model Locations

Our project stores ONNX models in the following locations:

- **Main VAD model**: `apps/playground/assets/silero_vad.onnx`
- **Language/Speaker models**: `apps/playground/assets/models/*.onnx`
- **Sherpa ONNX models**: Various locations in `apps/sherpa-onnx-demo/`

## Adding New Models

When adding new ONNX models to the repository:

1. Make sure Git LFS is tracking the new files:
   ```bash
   git lfs track "*.onnx"
   ```

2. Add and commit as usual:
   ```bash
   git add path/to/your/model.onnx
   git commit -m "Add new model for XYZ feature"
   ```

3. Push both the Git repository and LFS objects:
   ```bash
   git push
   ```

## Manual Setup (if needed)

If you prefer to set up Git LFS manually instead of using our script:

```bash
# Install Git LFS
git lfs install

# Set up hooks manually
mkdir -p .githooks
echo '#!/bin/bash
git lfs pull' > .githooks/post-checkout
echo '#!/bin/bash
git lfs pull' > .githooks/post-merge
chmod +x .githooks/post-checkout .githooks/post-merge
git config core.hooksPath .githooks

# Pull LFS files
git lfs pull
``` 