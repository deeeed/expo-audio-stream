#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
APP_ROOT="$(pwd)" exec node "$(git rev-parse --show-toplevel)/scripts/agentic/validate-flow-schema.js" "$@"
