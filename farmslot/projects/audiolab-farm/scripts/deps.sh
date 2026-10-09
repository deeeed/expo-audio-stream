#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "${1:?repo path required}"
export YARN_CACHE_FOLDER="$PWD/.agent/cache/yarn"
mkdir -p "$YARN_CACHE_FOLDER"
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 yarn install --immutable
(cd apps/playground && yarn build:deps)
