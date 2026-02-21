#!/bin/bash
# wake-devices.sh — bring connected devices to foreground via deeplink.
#
# When native apps are backgrounded, Metro still sees them in /json/list
# but the JS runtime doesn't respond to CDP commands. This script sends
# a deeplink to each connected platform to bring the app to the foreground.
#
# Usage:
#   scripts/agentic/wake-devices.sh [--platform ios|android|all]
#
# Requires:
#   iOS    — xcrun simctl (Xcode CLI tools)
#   Android — adb (Android SDK)

set -euo pipefail
cd "$(dirname "$0")/../.."

SCHEME="${APP_SCHEME:-audioplayground}"
BUNDLE_ID="${APP_BUNDLE_ID:-net.siteed.audioplayground}"
PLATFORM="${1:-all}"

wake_ios() {
  echo "Waking iOS simulators..."
  # Get all booted simulators
  local devices
  devices=$(xcrun simctl list devices booted 2>/dev/null | grep "Booted" | sed 's/.*(\(.*\)) (Booted).*/\1/')
  if [[ -z "$devices" ]]; then
    echo "  No booted iOS simulators found."
    return
  fi
  while IFS= read -r udid; do
    echo "  Sending deeplink to simulator $udid"
    xcrun simctl openurl "$udid" "${SCHEME}://" 2>/dev/null || true
  done <<< "$devices"
}

wake_android() {
  echo "Waking Android devices..."
  local devices
  devices=$(adb devices 2>/dev/null | grep -E "^\S+\s+(device)$" | awk '{print $1}')
  if [[ -z "$devices" ]]; then
    echo "  No connected Android devices found."
    return
  fi
  while IFS= read -r serial; do
    echo "  Sending deeplink to $serial"
    adb -s "$serial" shell am start -W \
      -a android.intent.action.VIEW \
      -d "${SCHEME}://" \
      "$BUNDLE_ID" 2>/dev/null | grep -E "Complete|Error" || true
  done <<< "$devices"
}

case "$PLATFORM" in
  ios)
    wake_ios
    ;;
  android)
    wake_android
    ;;
  all|*)
    wake_ios
    wake_android
    ;;
esac

echo "Done. Run 'yarn devices' to confirm devices are active."
