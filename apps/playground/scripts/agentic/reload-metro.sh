#!/bin/bash
# Thin wrapper for backwards compatibility. Use device-cmd.sh for full command set.
cd "$(dirname "$0")/../.."
exec scripts/agentic/device-cmd.sh "$@" reload
