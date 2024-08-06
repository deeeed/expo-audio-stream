#!/bin/bash
set -e
# Bump version
yarn version patch
version=$(node -p "require('./package.json').version")
git add .
git commit -m "feat: bump version to $version"
yarn build:clean && yarn npm publish
rm package-lock.json