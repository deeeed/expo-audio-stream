#!/usr/bin/env bash
# native-logs.sh — Retrieve native Kotlin/Swift logs from Android/iOS devices.
#
# Filters by app-specific tags defined in agentic.conf.
#
# Usage:
#   native-logs.sh android          # Dump recent Android logs
#   native-logs.sh ios              # Stream iOS simulator logs (5s)
#   native-logs.sh android follow   # Follow Android logs in real-time
#   native-logs.sh android 50       # Last 50 lines
#   native-logs.sh ios 30           # Stream iOS logs, last 30 lines
#   native-logs.sh android clear    # Clear Android logcat buffer

set -euo pipefail

# Parse --device <name> before platform arg (must be before _lib.sh sourcing
# so we can pass device info through)
DEVICE_NAME=""
_REMAINING_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_NAME="$2"; shift 2 ;;
    *) _REMAINING_ARGS+=("$1"); shift ;;
  esac
done
set -- "${_REMAINING_ARGS[@]}"

APP_ROOT="${APP_ROOT:-$(pwd)}"
source "$(cd "$APP_ROOT" && git rev-parse --show-toplevel)/scripts/agentic/_lib.sh"

PLATFORM="${1:-}"
MODE="${2:-}"

# Apply --device to platform-specific env vars
if [[ -n "$DEVICE_NAME" ]]; then
  ANDROID_DEVICE="${ANDROID_DEVICE:-$DEVICE_NAME}"
  IOS_SIMULATOR="${IOS_SIMULATOR:-$DEVICE_NAME}"
fi

ANDROID_FILTER="${AGENTIC_ANDROID_LOG_FILTER}"
IOS_PREDICATE="${AGENTIC_IOS_LOG_PREDICATE}"

usage() {
  cat <<EOF
native-logs.sh — Retrieve native logs

Usage:
  native-logs.sh [--device <name>] android              Dump recent Android logs (filtered)
  native-logs.sh [--device <name>] ios                  Stream iOS simulator logs for 5 seconds
  native-logs.sh android follow                         Follow Android logs in real-time (Ctrl+C to stop)
  native-logs.sh android <N>                            Show last N lines of filtered Android logs
  native-logs.sh ios <N>                                Stream iOS logs, show last N lines
  native-logs.sh android clear                          Clear Android logcat buffer

Options:
  --device <name>  Target device name (sets ANDROID_DEVICE / IOS_SIMULATOR)

Environment (fallback if --device not given):
  ANDROID_DEVICE   ADB serial for target device (optional)
  IOS_SIMULATOR    Simulator name for iOS (default: booted)
EOF
  exit 0
}

if [[ -z "$PLATFORM" || "$PLATFORM" == "--help" || "$PLATFORM" == "-h" ]]; then
  usage
fi

android_logs() {
  local adb_target=""
  if [[ -n "${ANDROID_DEVICE:-}" ]]; then
    adb_target="-s $ANDROID_DEVICE"
  fi

  case "${MODE}" in
    follow)
      echo "Following Android native logs (Ctrl+C to stop)..." >&2
      # shellcheck disable=SC2086
      adb $adb_target logcat -v threadtime | grep -E --line-buffered "$ANDROID_FILTER"
      ;;
    clear)
      echo "Clearing Android logcat buffer..." >&2
      # shellcheck disable=SC2086
      adb $adb_target logcat -c
      echo "Logcat buffer cleared."
      ;;
    ""|dump)
      # shellcheck disable=SC2086
      adb $adb_target logcat -d -v threadtime | grep -E "$ANDROID_FILTER" || echo "(no matching logs found)"
      ;;
    *)
      if [[ "$MODE" =~ ^[0-9]+$ ]]; then
        # shellcheck disable=SC2086
        adb $adb_target logcat -d -v threadtime | grep -E "$ANDROID_FILTER" | tail -n "$MODE"
      else
        echo "Unknown mode: $MODE" >&2
        usage
      fi
      ;;
  esac
}

ios_logs() {
  local udid
  if [[ -n "${IOS_SIMULATOR:-}" ]]; then
    udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
target = '${IOS_SIMULATOR}'
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d.get('name') == target and d.get('state') == 'Booted':
            print(d['udid'])
            sys.exit(0)
print('')
" 2>/dev/null)
  else
    udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d.get('state') == 'Booted':
            print(d['udid'])
            sys.exit(0)
print('')
" 2>/dev/null)
  fi

  if [[ -z "$udid" ]]; then
    echo "ERROR: No booted iOS simulator found." >&2
    echo "  Boot one with: xcrun simctl boot \"${AGENTIC_DEFAULT_SIMULATOR}\"" >&2
    exit 1
  fi

  local sim_name
  sim_name=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    for d in devices:
        if d.get('udid') == '$udid':
            print(d.get('name', 'Unknown'))
            sys.exit(0)
" 2>/dev/null || echo "Unknown")

  local timeout=5
  local line_limit=""

  case "${MODE}" in
    follow)
      echo "Following iOS simulator logs for $sim_name ($udid)..." >&2
      echo "(Ctrl+C to stop)" >&2
      timeout=0
      ;;
    "")
      echo "Streaming iOS simulator logs for $sim_name ($udid) for ${timeout}s..." >&2
      ;;
    *)
      if [[ "$MODE" =~ ^[0-9]+$ ]]; then
        line_limit="$MODE"
        echo "Streaming iOS simulator logs for $sim_name ($udid), last $line_limit lines..." >&2
      else
        echo "Unknown mode: $MODE" >&2
        usage
      fi
      ;;
  esac

  if [[ "$timeout" -eq 0 ]]; then
    if [[ -n "$line_limit" ]]; then
      xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null | tail -n "$line_limit"
    else
      xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null
    fi
  else
    if [[ -n "$line_limit" ]]; then
      timeout "${timeout}s" xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null | tail -n "$line_limit" || true
    else
      timeout "${timeout}s" xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null || true
    fi
  fi
}

case "$PLATFORM" in
  android)
    android_logs
    ;;
  ios)
    ios_logs
    ;;
  *)
    echo "ERROR: Unknown platform '$PLATFORM'. Use 'android' or 'ios'." >&2
    usage
    ;;
esac
