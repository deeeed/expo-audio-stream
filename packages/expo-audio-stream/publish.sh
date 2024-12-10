#!/bin/bash
set -e

# Change to script's directory
cd "$(dirname "$0")"
echo "Changed to script directory: $(pwd)"

echo "Starting publication process..."

publisher release

# Get new version after bump
version=$(node -p "require('./package.json').version")
echo "New version: $version"

# Update documentation
echo "Generating updated documentation..."
yarn docgen

echo "Waiting while docs are generated..."
sleep 2

# sleep 1
# # Publish playground app
# echo "Publishing playground app..."
# cd ../../apps/playground
# yarn deploy

# # Publish minimal app (assuming it has a similar deploy script)
# echo "Publishing minimal app..."
# cd ../minimal
# yarn deploy

# Commit changes
echo "Committing changes..."
git add "$(pwd)/../../" # add all changes in the root folder
git commit -m "feat: bump version to $version"

echo "Publication process completed successfully!"
