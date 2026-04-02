#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
APP_ROOT="$(pwd)"
export APP_VARIANT="${APP_VARIANT:-development}"

if [ "${PLATFORM:-ios}" = "android" ]; then
  bash scripts/sync-android-dev-config.sh
  bash scripts/agentic/android-doctor.sh
fi

exec bash "$(git rev-parse --show-toplevel)/scripts/agentic/preflight.sh" "$@"
