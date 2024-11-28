#!/bin/bash
set -e

# Change to script's directory
cd "$(dirname "$0")"
echo "Changed to script directory: $(pwd)"

echo "Starting publication process..."

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"

# Function to check if version exists in CHANGELOG.md
check_changelog_version() {
    local version=$1
    if ! grep -q "## \[$version\]" CHANGELOG.md; then
        echo "Error: Version [$version] not found in CHANGELOG.md"
        
        # Find the last release tag
        last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
        
        if [ -n "$last_tag" ]; then
            echo -e "\nCommits since last release ($last_tag):"
            git log --pretty=format:"- %s (%h)" $last_tag..HEAD
            echo -e "\nPlease add a changelog entry for version [$version] before publishing."
        else
            echo -e "\nNo previous tags found. Here are the recent commits:"
            git log --pretty=format:"- %s (%h)" -n 10
        fi
        
        return 1
    fi
    return 0
}

# Calculate potential versions
potential_patch=$(node -e "const [major, minor, patch] = '${current_version}'.split('.'); console.log(\`\${major}.\${minor}.\${Number(patch) + 1}\`)")
potential_minor=$(node -e "const [major, minor, patch] = '${current_version}'.split('.'); console.log(\`\${major}.\${Number(minor) + 1}.0\`)")
potential_major=$(node -e "const [major, minor, patch] = '${current_version}'.split('.'); console.log(\`\${Number(major) + 1}.0.0\`)")

# Ask user for version bump type with actual version numbers
echo "Current version: $current_version"
echo "Please select version bump type:"
echo "1) patch ($potential_patch)"
echo "2) minor ($potential_minor)"
echo "3) major ($potential_major)"
echo "4) manual"
read -p "Enter choice (1-4): " choice

# Store the target version before making any changes
case $choice in
    1)
        yarn version patch
        target_version=$potential_patch
        ;;
    2)
        yarn version minor
        target_version=$potential_minor
        ;;
    3)
        yarn version major
        target_version=$potential_major
        ;;
    4)
        read -p "Enter new version (current: $current_version): " target_version
        yarn version $target_version
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Check changelog before proceeding
if ! check_changelog_version "$target_version"; then
    # Revert package.json changes
    git checkout -- package.json
    exit 1
fi

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
