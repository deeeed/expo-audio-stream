#!/bin/bash
set -e
# Bump version
yarn version patch
version=$(node -p "require('./package.json').version")
git add .
git commit -m "feat: bump version to $version"
echo "Generated updated documentation for version $version"
yarn docgen
yarn clean && yarn prepare && yarn npm publish
rm package-lock.json