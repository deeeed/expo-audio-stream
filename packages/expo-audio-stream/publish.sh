#!/bin/bash
set -e

echo "Starting publication process..."

# Bump version
echo "Bumping version..."
yarn version patch
version=$(node -p "require('./package.json').version")
echo "New version: $version"

# Update documentation
echo "Generating updated documentation..."
yarn docgen

echo "Waiting while docs are generated..."
wait 3000

# Prepare and publish package
echo "Preparing and publishing package..."
yarn clean && yarn prepare && yarn npm publish

# Publish playground app
echo "Publishing playground app..."
cd ../../apps/playground
yarn deploy

# # Publish minimal app (assuming it has a similar deploy script)
# echo "Publishing minimal app..."
# cd ../minimal
# yarn deploy

# Commit changes
echo "Committing changes..."
git add .
git commit -m "feat: bump version to $version"

echo "Publication process completed successfully!"
