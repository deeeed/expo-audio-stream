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
echo -e "${BLUE}           📱 Minimal App Deployment 📱            ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Function to update version in package.json
update_version() {
  # Get current version from package.json
  CURRENT_VERSION=$(grep -o '"version": "[^"]*' package.json | cut -d'"' -f4)
  echo -e "${CYAN}Current version: ${GREEN}$CURRENT_VERSION${NC}"

  # Ask if user wants to update version - default to Yes
  read -p "$(echo -e ${YELLOW}"Do you want to update the version before publishing? (Y/n): "${NC})" UPDATE_VERSION
  UPDATE_VERSION=${UPDATE_VERSION:-y}  # Default to yes

  if [[ "$UPDATE_VERSION" != "y" && "$UPDATE_VERSION" != "Y" ]]; then
    echo -e "${CYAN}Version update skipped. Continuing with current version.${NC}"
    return
  fi

  # Parse current version
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
  
  # Calculate next versions
  NEXT_MAJOR="$((MAJOR+1)).0.0"
  NEXT_MINOR="$MAJOR.$((MINOR+1)).0"
  NEXT_PATCH="$MAJOR.$MINOR.$((PATCH+1))"

  # Display version options
  echo -e "\n${CYAN}Select new version:${NC}"
  echo -e "1. ${GREEN}$NEXT_PATCH${NC} (Patch - for bug fixes)"
  echo -e "2. ${GREEN}$NEXT_MINOR${NC} (Minor - for new features)"
  echo -e "3. ${GREEN}$NEXT_MAJOR${NC} (Major - for breaking changes)"
  echo -e "4. Custom version"

  # Ask user to select version
  read -p "$(echo -e ${YELLOW}"Enter your choice [1]: "${NC})" VERSION_CHOICE
  VERSION_CHOICE=${VERSION_CHOICE:-1}  # Default to patch version

  case $VERSION_CHOICE in
    1)
      NEW_VERSION=$NEXT_PATCH
      ;;
    2)
      NEW_VERSION=$NEXT_MINOR
      ;;
    3)
      NEW_VERSION=$NEXT_MAJOR
      ;;
    4)
      read -p "$(echo -e ${YELLOW}"Enter custom version (format: x.y.z): "${NC})" NEW_VERSION
      if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}Invalid version format. Please use x.y.z format where x, y, z are numbers.${NC}"
        exit 1
      fi
      ;;
    *)
      echo -e "${RED}Invalid choice. Using patch version.${NC}"
      NEW_VERSION=$NEXT_PATCH
      ;;
  esac

  # Confirm version update
  read -p "$(echo -e ${YELLOW}"Update version from $CURRENT_VERSION to $NEW_VERSION? (Y/n): "${NC})" CONFIRM_UPDATE
  CONFIRM_UPDATE=${CONFIRM_UPDATE:-y}  # Default to yes

  if [[ "$CONFIRM_UPDATE" != "y" && "$CONFIRM_UPDATE" != "Y" ]]; then
    echo -e "${RED}Version update cancelled.${NC}"
    exit 0
  fi

  # Update package.json
  sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json

  echo -e "${GREEN}✅ Version updated to $NEW_VERSION in package.json${NC}"

  # Ask if user wants to commit changes
  read -p "$(echo -e ${YELLOW}"Commit version changes to git? (Y/n): "${NC})" COMMIT_CHANGES
  COMMIT_CHANGES=${COMMIT_CHANGES:-y}  # Default to yes

  if [[ "$COMMIT_CHANGES" == "y" || "$COMMIT_CHANGES" == "Y" ]]; then
    git add package.json
    git commit -m "chore: bump minimal app version to $NEW_VERSION"
    echo -e "${GREEN}✅ Changes committed to git${NC}"
  fi
}

# Deploy to web function
deploy_web() {
  echo -e "\n${CYAN}Preparing web deployment...${NC}"
  read -p "$(echo -e ${YELLOW}"Choose environment (development/production) [production]: "${NC})" WEB_ENV
  WEB_ENV=${WEB_ENV:-production}
  
  if [[ "$WEB_ENV" == "development" ]]; then
    echo -e "${CYAN}Deploying to web (development)...${NC}"
    NODE_ENV=development expo export -p web && yarn serve dist/
  else
    echo -e "${CYAN}Deploying to web (production)...${NC}"
    NODE_ENV=production expo export -p web && gh-pages -t -d dist --dest minimal
  fi
  
  echo -e "${GREEN}✅ Web deployment completed!${NC}"
}

# Main execution flow
echo -e "${CYAN}This script will help you deploy the Minimal App to the web.${NC}"

# Update version first
update_version

# Deploy to web
deploy_web

echo -e "\n${GREEN}🎉 Deployment completed successfully! 🎉${NC}" 