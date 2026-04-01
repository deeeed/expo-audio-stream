#!/bin/bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-$(pwd)}"
MONOREPO_ROOT="$(cd "$APP_ROOT" && git rev-parse --show-toplevel)"

exec node "$MONOREPO_ROOT/scripts/agentic/validate-recipe.js" "$@"
