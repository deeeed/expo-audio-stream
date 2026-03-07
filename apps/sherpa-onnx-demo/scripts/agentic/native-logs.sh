#!/usr/bin/env bash
# native-logs.sh — Retrieve native Kotlin/Swift logs from Android/iOS devices.
#
# Filters by SherpaOnnx tags on both platforms.
#
# Usage:
#   scripts/agentic/native-logs.sh android          # Dump recent Android logs
#   scripts/agentic/native-logs.sh ios              # Stream iOS simulator logs (5s)
#   scripts/agentic/native-logs.sh android follow   # Follow Android logs in real-time
#   scripts/agentic/native-logs.sh android 50       # Last 50 lines
#   scripts/agentic/native-logs.sh android clear    # Clear Android logcat buffer

set -euo pipefail

# Parse --device <name> before platform arg
DEVICE_NAME=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_NAME="$2"; shift 2 ;;
    *) break ;;
  esac
done
PLATFORM="${1:-}"
MODE="${2:-}"

if [[ -n "$DEVICE_NAME" ]]; then
  ANDROID_DEVICE="${ANDROID_DEVICE:-$DEVICE_NAME}"
  IOS_SIMULATOR="${IOS_SIMULATOR:-$DEVICE_NAME}"
fi

# Android log filter: SherpaOnnx module tags
ANDROID_FILTER='SherpaOnnx|SherpaOnnxModule|SherpaOnnxTts|SherpaOnnxAsr|SherpaOnnxTurbo|net.siteed.sherpaonnx'

# iOS log filter
IOS_PREDICATE='eventMessage CONTAINS "SherpaOnnx" OR eventMessage CONTAINS "sherpa-onnx"'

usage() {
  cat <<'EOF'
native-logs.sh — Retrieve native SherpaOnnx logs

Usage:
  native-logs.sh [--device <name>] android              Dump recent Android logs (filtered)
  native-logs.sh [--device <name>] ios                  Stream iOS simulator logs for 5 seconds
  native-logs.sh android follow                         Follow Android logs in real-time (Ctrl+C to stop)
  native-logs.sh android <N>                            Show last N lines of filtered Android logs
  native-logs.sh ios <N>                                Stream iOS logs, show last N lines
  native-logs.sh android clear                          Clear Android logcat buffer

Filter tags:
  Android: SherpaOnnx, SherpaOnnxModule, SherpaOnnxTts, SherpaOnnxAsr
  iOS:     SherpaOnnx, sherpa-onnx

Options:
  --device <name>  Target device name
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
    exit 1
  fi

  local timeout=5
  local line_limit=""

  case "${MODE}" in
    follow)
      timeout=0
      ;;
    "")
      echo "Streaming iOS logs for ${timeout}s..." >&2
      ;;
    *)
      if [[ "$MODE" =~ ^[0-9]+$ ]]; then
        line_limit="$MODE"
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
