#!/bin/bash
set -e

# Change to script's directory
cd "$(dirname "$0")"
echo "Changed to script directory: $(pwd)"

echo "Starting publication process..."

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"

# Ask user for version bump type
echo "Please select version bump type:"
echo "1) patch (x.x.X)"
echo "2) minor (x.X.0)"
echo "3) major (X.0.0)"
echo "4) manual"
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        yarn version patch
        ;;
    2)
        yarn version minor
        ;;
    3)
        yarn version major
        ;;
    4)
        read -p "Enter new version (current: $current_version): " new_version
        yarn version $new_version
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Get new version after bump
version=$(node -p "require('./package.json').version")
echo "New version: $version"

# Update documentation
echo "Generating updated documentation..."
yarn docgen

echo "Waiting while docs are generated..."
sleep 2

# Prepare and publish package
echo "Preparing and publishing package..."
yarn clean && yarn prepare && yarn npm publish

sleep 1
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
git add "$(pwd)/../../" # add all changes in the root folder
git commit -m "feat: bump version to $version"

echo "Publication process completed successfully!"
