#!/usr/bin/env bash
# native-logs.sh — Retrieve native Kotlin/Swift logs from Android/iOS devices.
#
# Filters by ExpoAudioStudio tags (LogUtils.kt on Android, Logger.swift on iOS)
# plus legacy tags (ExpoAudioStream, AudioTrimmer, AudioDeviceManager).
#
# Usage:
#   scripts/agentic/native-logs.sh android          # Dump recent Android logs
#   scripts/agentic/native-logs.sh ios              # Stream iOS simulator logs (5s)
#   scripts/agentic/native-logs.sh android follow   # Follow Android logs in real-time
#   scripts/agentic/native-logs.sh android 50       # Last 50 lines
#   scripts/agentic/native-logs.sh ios 30           # Stream iOS logs, last 30 lines
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

# Apply --device to platform-specific env vars (flag takes precedence, env vars as fallback)
if [[ -n "$DEVICE_NAME" ]]; then
  ANDROID_DEVICE="${ANDROID_DEVICE:-$DEVICE_NAME}"
  IOS_SIMULATOR="${IOS_SIMULATOR:-$DEVICE_NAME}"
fi

# Android log filter: ExpoAudioStudio (LogUtils), ExpoAudioStream (Constants.TAG),
# AudioTrimmer, AudioDeviceManager, RecordingActionReceiver
ANDROID_FILTER='ExpoAudioStudio|ExpoAudioStream|AudioTrimmer|AudioDeviceManager|RecordingActionReceiver'

# iOS log filter: Logger.swift uses [ExpoAudioStudio:ClassName] format
IOS_PREDICATE='eventMessage CONTAINS "ExpoAudioStudio" OR eventMessage CONTAINS "ExpoAudioStream"'

usage() {
  cat <<'EOF'
native-logs.sh — Retrieve native Kotlin/Swift logs

Usage:
  native-logs.sh [--device <name>] android              Dump recent Android logs (filtered)
  native-logs.sh [--device <name>] ios                  Stream iOS simulator logs for 5 seconds
  native-logs.sh android follow                         Follow Android logs in real-time (Ctrl+C to stop)
  native-logs.sh android <N>                            Show last N lines of filtered Android logs
  native-logs.sh ios <N>                                Stream iOS logs, show last N lines
  native-logs.sh android clear                          Clear Android logcat buffer

Examples with --device:
  native-logs.sh --device "Pixel 6a" android
  native-logs.sh --device "iPhone 16 Pro Max" ios

Filter tags:
  Android: ExpoAudioStudio, ExpoAudioStream, AudioTrimmer, AudioDeviceManager
  iOS:     [ExpoAudioStudio:*] (Logger.swift format)

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
      # Dump existing logs (non-blocking: -d flag)
      # shellcheck disable=SC2086
      adb $adb_target logcat -d -v threadtime | grep -E "$ANDROID_FILTER" || echo "(no matching logs found)"
      ;;
    *)
      # Numeric = show last N lines
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
  # Find booted simulator UDID
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
    echo "  Boot one with: xcrun simctl boot \"iPhone 16 Pro Max\"" >&2
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
      timeout=0  # no timeout
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

  # iOS simulator log streaming via simctl
  # The predicate filters for our log tags
  if [[ "$timeout" -eq 0 ]]; then
    # Follow mode — no timeout
    if [[ -n "$line_limit" ]]; then
      xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null | tail -n "$line_limit"
    else
      xcrun simctl spawn "$udid" log stream --level debug \
        --predicate "$IOS_PREDICATE" 2>/dev/null
    fi
  else
    # Timed capture
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
