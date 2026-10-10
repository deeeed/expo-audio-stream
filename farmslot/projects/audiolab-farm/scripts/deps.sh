#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/env.sh"
cd "${1:?repo path required}"
export YARN_CACHE_FOLDER="$PWD/.agent/cache/yarn"
mkdir -p "$YARN_CACHE_FOLDER"
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 yarn install --immutable # NOSONAR: locked bootstrap requires workspace prepare, native prebuilts and patch-package lifecycle hooks.
(cd apps/playground && yarn build:deps)
bash "$SCRIPT_DIR/prepare-web.sh" "$PWD"

if [[ -n "${IOS_DEVICE_UDID:-}" ]] && [[ ! -x "$PWD/.agent/tools/ios/bin/python" ]]; then
  /opt/homebrew/bin/python3.12 -m venv "$PWD/.agent/tools/ios"
  PIP_CACHE_DIR="$PWD/.agent/cache/pip" "$PWD/.agent/tools/ios/bin/pip" --isolated install \
    --index-url https://pypi.org/simple pymobiledevice3==11.26.0
fi
