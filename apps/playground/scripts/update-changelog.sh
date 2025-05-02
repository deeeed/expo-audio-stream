#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Disable git pager
export GIT_PAGER=cat

# Ensure we exit on errors
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}            📝 Simple Changelog Helper 📝          ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Define constants
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
  local PREV_TAG=$(git --no-pager tag | grep "^$PACKAGE_NAME@" | sort -V | tail -1 2>/dev/null || echo "")
  
  echo -e "\n${CYAN}=== Commit history ====${NC}"
  echo -e "${GREEN}Command to view all commits since last tag:${NC}"
  echo -e "  git --no-pager log --pretty=format:\"%h %s\" ${PREV_TAG:+$PREV_TAG..HEAD} -- ."
  
  if [ -n "$PREV_TAG" ]; then
    echo -e "\n${CYAN}All commits since ${PREV_TAG} (unfiltered):${NC}"
    echo -e "${YELLOW}-----------------------------------${NC}"
    
    # Show raw commits without filtering
    git --no-pager log --pretty=format:"- %h %s" $PREV_TAG..HEAD || echo "  No commits found"
    
    echo -e "\n${YELLOW}-----------------------------------${NC}"
    echo -e "${GREEN}Categorized commits:${NC}"
    echo -e "${YELLOW}-----------------------------------${NC}"
    
    # Get all commits since last tag
    COMMITS=$(git --no-pager log --pretty=format:"- %s (%h)" $PREV_TAG..HEAD)
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
    git --no-pager diff --name-only $PREV_TAG HEAD | sed 's/^/- /' || echo "  None"
  else
    echo -e "\n${CYAN}No previous tag found. Showing recent commits:${NC}"
    echo -e "${YELLOW}-----------------------------------${NC}"
    git --no-pager log --pretty=format:"- %h %s" -n 15 || echo "  No commits found"
    
    echo -e "\n${GREEN}Changed files (recent commits):${NC}"
    git --no-pager diff --name-only HEAD~15 HEAD 2>/dev/null | sed 's/^/- /' || echo "  None"

    # Show changed files
    echo -e "\n${GREEN}Changed files:${NC}"
    git --no-pager diff --name-only $PREV_TAG HEAD | sed 's/^/- /' || echo "  None"
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
  local PREV_TAG=$(git --no-pager tag | grep "^$PACKAGE_NAME@" | sort -V | tail -1 2>/dev/null || echo "")
  
  echo -e "\n${CYAN}Creating changelog entry for version $VERSION...${NC}"
  
  # Create a backup of the existing changelog if it exists
  if [ -f "$CHANGELOG_FILE" ]; then
    cp "$CHANGELOG_FILE" "$CHANGELOG_FILE.bak"
  fi
  
  # Get all commits since last tag
  local FEATURES=""
  local FIXES=""
  local CHANGES=""
  
  if [ -n "$PREV_TAG" ]; then
    # Extract feature commits - make sure to format them as bulleted list
    FEATURES=$(git --no-pager log --pretty=format:"%s" $PREV_TAG..HEAD | grep -i "feat:\|feature:\|feat " | sed -E 's/^(feat|feature)(\([^)]*\))?:? ?//i' | sed 's/^/- /' || echo "")
    
    # Extract fix commits - make sure to format them as bulleted list
    FIXES=$(git --no-pager log --pretty=format:"%s" $PREV_TAG..HEAD | grep -i "fix:\|bugfix:\|fix " | sed -E 's/^(fix|bugfix)(\([^)]*\))?:? ?//i' | sed 's/^/- /' || echo "")
    
    # Extract other commits (chore, refactor, etc) - make sure to format them as bulleted list
    CHANGES=$(git --no-pager log --pretty=format:"%s" $PREV_TAG..HEAD | grep -v -i "feat\|fix\|feature\|bugfix" | sed -E 's/^(chore|refactor|style|docs|perf|test|ci|build)(\([^)]*\))?:? ?//i' | sed 's/^/- /' || echo "")
  fi
  
  # If FEATURES is empty, add a placeholder
  if [ -z "$FEATURES" ]; then
    FEATURES="- "
  fi
  
  # If FIXES is empty, add a placeholder
  if [ -z "$FIXES" ]; then
    FIXES="- "
  fi
  
  # If CHANGES is empty, add a placeholder
  if [ -z "$CHANGES" ]; then
    CHANGES="- "
  fi
  
  # Create a new changelog section to display for confirmation
  NEW_SECTION=$(cat <<EOF

## [$VERSION] - $DATE

### Added
$FEATURES

### Changed
$CHANGES

### Fixed
$FIXES
EOF
)

  # Show new section to user and ask for confirmation
  echo -e "${GREEN}=== New Changelog Section ====${NC}"
  echo -e "${CYAN}$NEW_SECTION${NC}"
  echo -e "${GREEN}============================${NC}"
  
  read -p "$(echo -e ${YELLOW}"Do you want to add this to your changelog? (Y/n): "${NC})" CONFIRM_CHANGE
  CONFIRM_CHANGE=${CONFIRM_CHANGE:-y}
  
  if [[ "$CONFIRM_CHANGE" != "y" && "$CONFIRM_CHANGE" != "Y" ]]; then
    echo -e "${RED}Operation cancelled. No changes made to $CHANGELOG_FILE.${NC}"
    return 1
  fi
  
  # Create temp file for the new changelog
  TMP_FILE=$(mktemp)
  
  # Initialize the changelog file if it doesn't exist
  if [ ! -f "$CHANGELOG_FILE" ] || [ ! -s "$CHANGELOG_FILE" ]; then
    cat > "$TMP_FILE" << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
$NEW_SECTION

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
        echo -e "$NEW_SECTION"
        
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
$NEW_SECTION
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
  
  echo -e "${GREEN}✅ Changelog entry created for version $VERSION with detected commits${NC}"
  echo -e "${YELLOW}Review $CHANGELOG_FILE and edit if needed${NC}"
  
  return 0
}

# Main script execution
if [ -n "$1" ]; then
  VERSION=$1
else
  VERSION=$CURRENT_VERSION
fi

# Verify version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Invalid version format. Please use x.y.z format.${NC}"
  exit 1
fi

# Check if version exists in changelog
if ! check_version_in_changelog "$VERSION"; then
  # Create the changelog entry with confirmation
  if ! create_changelog_entry "$VERSION"; then
    echo -e "${YELLOW}Exiting without creating changelog entry.${NC}"
    exit 0
  fi
fi

# Show recent commits to help the user understand what changed
show_recent_commits

# Show final instructions
echo -e "\n${CYAN}=========================================${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review ${CHANGELOG_FILE} - commits were automatically added"
echo -e "2. Edit if needed with your preferred editor"
echo -e "3. Add to git: git add ${CHANGELOG_FILE}"
echo -e "4. Commit: git commit -m \"docs: update changelog for $VERSION\""
echo -e "5. Create a tag: git tag -a ${PACKAGE_NAME}@${VERSION} -m \"Version ${VERSION}\""
echo -e "6. Push tag: git push origin ${PACKAGE_NAME}@${VERSION}"
echo -e "${CYAN}=========================================${NC}"

exit 0
