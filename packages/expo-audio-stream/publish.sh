#!/bin/bash
set -e
# Bump version
yarn version patch
version=$(node -p "require('./package.json').version")
git add .
echo "Generated updated documentation for version $version"
yarn docgen
yarn clean && yarn prepare && yarn npm publish
git commit -m "feat: bump version to $version"
