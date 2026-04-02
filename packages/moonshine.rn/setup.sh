#!/bin/bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v git >/dev/null 2>&1 || {
  echo -e "${RED}Error: git is required.${NC}" >&2
  exit 1
}

mkdir -p third_party
mkdir -p prebuilt/android

MOONSHINE_VERSION="$(node -p "require('./package.json').moonshineVersion")"
UPSTREAM_DIR="$SCRIPT_DIR/third_party/moonshine"

echo -e "${BLUE}Setting up Moonshine upstream checkout (${MOONSHINE_VERSION})...${NC}"

if [ ! -d "$UPSTREAM_DIR/.git" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git clone --branch "$MOONSHINE_VERSION" --depth 1 https://github.com/moonshine-ai/moonshine "$UPSTREAM_DIR"
  cd "$UPSTREAM_DIR"
  git reset --hard "refs/tags/$MOONSHINE_VERSION"
  cd "$SCRIPT_DIR"
else
  cd "$UPSTREAM_DIR"
  git fetch --tags origin
  git checkout "$MOONSHINE_VERSION"
  git reset --hard "refs/tags/$MOONSHINE_VERSION"
  cd "$SCRIPT_DIR"
fi

./apply-upstream-patches.sh

echo -e "${GREEN}Moonshine upstream checkout is ready.${NC}"
echo -e "${YELLOW}Build Android source artifact with:${NC}"
echo -e "${YELLOW}  bash packages/moonshine.rn/build-moonshine-android.sh${NC}"
