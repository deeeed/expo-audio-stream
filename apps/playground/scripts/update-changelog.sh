#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure we exit on errors
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}            📝 Simple Changelog Helper 📝          ${NC}"
echo -e "${BLUE}===================================================${NC}"

CHANGELOG_FILE="CHANGELOG.md"
# We're already in apps/playground, so use . as the path
PLAYGROUND_PATHS="."

# Get package name and version from package.json
PACKAGE_NAME=$(grep -o '"name": "[^"]*' package.json | cut -d'"' -f4)
CURRENT_VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)

echo -e "${CYAN}Package: ${GREEN}$PACKAGE_NAME${NC}"
echo -e "${CYAN}Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Function to show recent commits
show_recent_commits() {
  local PREV_TAG=$(git tag | grep "^$PACKAGE_NAME@" | sort -V | tail -1 2>/dev/null || echo "")
  
  echo -e "\n${CYAN}=== Commit history ====${NC}"
  echo -e "${GREEN}How to view all commits since last tag:${NC}"
  echo -e "  git log --pretty=format:\"%h %s\" ${PREV_TAG:+$PREV_TAG..HEAD} -- $PLAYGROUND_PATHS"
  echo -e "\n${GREEN}How to view all changed files:${NC}"
  echo -e "  git diff --name-only ${PREV_TAG:+$PREV_TAG} HEAD -- $PLAYGROUND_PATHS"
  echo -e "\n${YELLOW}-----------------------------------${NC}"
  
  if [ -n "$PREV_TAG" ]; then
    echo -e "${GREEN}Recent commits since ${PREV_TAG}:${NC}"
    echo -e "${YELLOW}-----------------------------------${NC}"
    
    # Get all commits since last tag
    COMMITS=$(git log --pretty=format:"- %s (%h)" $PREV_TAG..HEAD -- $PLAYGROUND_PATHS)
    if [ -n "$COMMITS" ]; then
      # Extract feature commits
      echo -e "${GREEN}Features:${NC}"
      echo "$COMMITS" | grep -i "feat:\|feature:\|feat " || echo "  None"
      
      # Extract fix commits
      echo -e "\n${GREEN}Fixes:${NC}"
      echo "$COMMITS" | grep -i "fix:\|bugfix:\|fix " || echo "  None"
      
      # Show other commits
      echo -e "\n${GREEN}Other Changes:${NC}"
      echo "$COMMITS" | grep -v -i "feat\|fix\|feature\|bugfix" || echo "  None"
    else
      echo -e "${YELLOW}No commits found since last tag.${NC}"
    fi
    
    # Show changed files
    echo -e "\n${GREEN}Changed files:${NC}"
    git diff --name-only $PREV_TAG HEAD -- $PLAYGROUND_PATHS | sed 's/^/- /' || echo "  None"
  else
    echo -e "${CYAN}No previous tag found. Showing recent commits:${NC}"
    echo -e "${YELLOW}-----------------------------------${NC}"
    git log --pretty=format:"- %s (%h)" -n 15 -- $PLAYGROUND_PATHS || echo "  No commits found"
    
    echo -e "\n${GREEN}Changed files (recent commits):${NC}"
    git diff --name-only HEAD~15 HEAD -- $PLAYGROUND_PATHS 2>/dev/null | sed 's/^/- /' || echo "  None"
  fi
  
  # Command to create a tag after updating changelog
  echo -e "\n${YELLOW}-----------------------------------${NC}"
  echo -e "${CYAN}After updating the changelog, create a tag with:${NC}"
  echo -e "  git tag -a $PACKAGE_NAME@$VERSION -m \"Version $VERSION\""
  echo -e "  git push origin $PACKAGE_NAME@$VERSION"
  echo -e "${YELLOW}-----------------------------------${NC}"
}

# Function to check if version exists in changelog
check_version_in_changelog() {
  local VERSION=$1
  
  if [ -f "$CHANGELOG_FILE" ] && grep -q "## \[$VERSION\]" "$CHANGELOG_FILE"; then
    echo -e "${GREEN}✅ Version $VERSION already exists in changelog.${NC}"
    return 0
  else
    echo -e "${YELLOW}⚠️ Version $VERSION not found in changelog.${NC}"
    return 1
  fi
}

# Function to create a new changelog entry
create_changelog_entry() {
  local VERSION=$1
  local DATE=$(date +"%Y-%m-%d")
  local PREV_TAG=$(git tag | grep "^$PACKAGE_NAME@" | sort -V | tail -1 2>/dev/null || echo "")
  
  echo -e "\n${CYAN}Creating changelog entry for version $VERSION...${NC}"
  
  # Create a backup of the existing changelog if it exists
  if [ -f "$CHANGELOG_FILE" ]; then
    cp "$CHANGELOG_FILE" "$CHANGELOG_FILE.bak"
  fi
  
  # Create temp file for the new changelog
  TMP_FILE=$(mktemp)
  
  # Initialize the changelog file if it doesn't exist
  if [ ! -f "$CHANGELOG_FILE" ] || [ ! -s "$CHANGELOG_FILE" ]; then
    cat > "$TMP_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [$VERSION] - $DATE

### Added
- 

### Changed
- 

### Fixed
- 

[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/$PACKAGE_NAME@$VERSION...HEAD
[$VERSION]: https://github.com/deeeed/expo-audio-stream/releases/tag/$PACKAGE_NAME@$VERSION
EOF
  else
    # Check if the file has an unreleased section
    if grep -q "## \[Unreleased\]" "$CHANGELOG_FILE"; then
      # Create a new file with version added after unreleased section
      {
        # Get everything from the beginning up to and including the unreleased line
        grep -B 1000 "## \[Unreleased\]" "$CHANGELOG_FILE" || cat "$CHANGELOG_FILE"
        
        # Add an empty line if there isn't one
        echo ""
        
        # Add the new version section
        cat << EOF
## [$VERSION] - $DATE

### Added
- 

### Changed
- 

### Fixed
- 
EOF
        
        # Get everything after the unreleased line (skip unreleased line itself)
        grep -A 1000 "## \[Unreleased\]" "$CHANGELOG_FILE" | tail -n +2 || true
      } > "$TMP_FILE"
      
      # Process the links at the bottom
      if grep -q "\[unreleased\]:" "$CHANGELOG_FILE"; then
        # Create temporary file with everything except links
        grep -v "^\[" "$TMP_FILE" > "$TMP_FILE.nolinks"
        
        # Get the repo URL from the existing unreleased link
        REPO_URL=$(grep "\[unreleased\]:" "$CHANGELOG_FILE" | head -1 | sed 's/\[unreleased\]: \(.*\)\/compare\/.*/\1/')
        
        # Add updated links
        echo "" >> "$TMP_FILE.nolinks"
        echo "[unreleased]: $REPO_URL/compare/$PACKAGE_NAME@$VERSION...HEAD" >> "$TMP_FILE.nolinks"
        
        if [ -n "$PREV_TAG" ]; then
          echo "[$VERSION]: $REPO_URL/compare/$PREV_TAG...$PACKAGE_NAME@$VERSION" >> "$TMP_FILE.nolinks"
        else
          echo "[$VERSION]: $REPO_URL/releases/tag/$PACKAGE_NAME@$VERSION" >> "$TMP_FILE.nolinks"
        fi
        
        # Add any other existing version links
        grep "^\[" "$CHANGELOG_FILE" | grep -v "^\[unreleased\]:" | grep -v "^\[$VERSION\]:" >> "$TMP_FILE.nolinks" || true
        
        # Replace temp file
        mv "$TMP_FILE.nolinks" "$TMP_FILE"
      fi
    else
      # No unreleased section, create one along with the new version
      cat > "$TMP_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [$VERSION] - $DATE

### Added
- 

### Changed
- 

### Fixed
- 

EOF
      # Append any existing content (skipping the header if it exists)
      if grep -q "# Changelog" "$CHANGELOG_FILE"; then
        grep -v "# Changelog" "$CHANGELOG_FILE" >> "$TMP_FILE" || true
      else
        cat "$CHANGELOG_FILE" >> "$TMP_FILE" || true
      fi
      
      # Add links at the bottom if they don't exist
      if ! grep -q "\[unreleased\]:" "$CHANGELOG_FILE"; then
        echo "" >> "$TMP_FILE"
        echo "[unreleased]: https://github.com/deeeed/expo-audio-stream/compare/$PACKAGE_NAME@$VERSION...HEAD" >> "$TMP_FILE"
        echo "[$VERSION]: https://github.com/deeeed/expo-audio-stream/releases/tag/$PACKAGE_NAME@$VERSION" >> "$TMP_FILE"
      fi
    fi
  fi
  
  # Replace the original file
  mv "$TMP_FILE" "$CHANGELOG_FILE"
  
  echo -e "${GREEN}✅ Changelog entry created for version $VERSION${NC}"
  echo -e "${YELLOW}Edit $CHANGELOG_FILE to add your changes${NC}"
}

# Main script execution

# Check if a version was specified
if [ -n "$1" ]; then
  VERSION=$1
else
  # Use current version if not provided
  VERSION=$CURRENT_VERSION
fi

# Verify version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Invalid version format. Please use x.y.z format.${NC}"
  exit 1
fi

# Check if version exists in changelog
if ! check_version_in_changelog "$VERSION"; then
  # Create the changelog entry
  create_changelog_entry "$VERSION"
fi

# Show recent commits to help the user
show_recent_commits

echo -e "\n${YELLOW}Now edit CHANGELOG.md to fill in the details for version $VERSION${NC}"
echo -e "${YELLOW}After updating the changelog, consider creating a tag:${NC}"
echo -e "${CYAN}git tag -a ${PACKAGE_NAME}@${VERSION} -m \"Version ${VERSION}\"${NC}"
echo -e "${CYAN}git push origin ${PACKAGE_NAME}@${VERSION}${NC}"

# Show instructions
echo -e "\n${CYAN}=========================================${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Edit ${CHANGELOG_FILE} to fill in the details for version $VERSION"
echo -e "2. Save the file"
echo -e "3. Add to git: git add ${CHANGELOG_FILE}"
echo -e "4. Commit: git commit -m \"docs: update changelog for $VERSION\""
echo -e "${CYAN}=========================================${NC}"

exit 0 