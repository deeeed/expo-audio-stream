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

SCHEME="${APP_SCHEME:-exp+sherpa-voice}"
BUNDLE_ID="${APP_BUNDLE_ID:-net.siteed.sherpavoice}"
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
    # Prevent Expo dev menu onboarding modal (expo-dev-menu)
    xcrun simctl spawn "$udid" defaults write "$BUNDLE_ID" EXDevMenuIsOnboardingFinished -bool YES 2>/dev/null || true
    xcrun simctl spawn "$udid" defaults write "$BUNDLE_ID" EXDevMenuDisableAutoLaunch -bool YES 2>/dev/null || true
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
    # Prevent Expo dev menu onboarding modal (expo-dev-menu)
    adb -s "$serial" shell run-as "$BUNDLE_ID" sh -c \
      "mkdir -p /data/data/$BUNDLE_ID/shared_prefs && cat > /data/data/$BUNDLE_ID/shared_prefs/expo.modules.devmenu.sharedpreferences.xml << 'PREFS'
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <boolean name=\"isOnboardingFinished\" value=\"true\" />
    <boolean name=\"showsAtLaunch\" value=\"false\" />
</map>
PREFS" 2>/dev/null || true
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

echo "Done."
