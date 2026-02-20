#!/bin/bash
# Take a screenshot of the iOS Simulator or Android device and save it to .agent/screenshots/.
#
# Usage: scripts/agentic/screenshot.sh [label] [platform]
#
#   label     Optional label for the filename (default: "screenshot")
#   platform  "ios" or "android". Also settable via PLATFORM env var.
#             When omitted and only one platform is connected, auto-detects.
#             When both are connected, prints an error asking you to specify.
#
# Output: prints the absolute path to the saved screenshot.
#
# iOS:  Auto-detects first booted simulator, or uses IOS_SIMULATOR env var.
# Android: Uses adb exec-out screencap. Targets ADB_SERIAL or first connected device.
#
# Keeps the last 20 screenshots.

set -euo pipefail

cd "$(dirname "$0")/../.."

LABEL="${1:-screenshot}"
PLATFORM_ARG="${2:-}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DIR=".agent/screenshots"
mkdir -p "$DIR"

# -- Platform detection ----------------------------------------------------
detect_platform() {
  # Explicit override: arg > env var
  local explicit="${PLATFORM_ARG:-${PLATFORM:-}}"
  if [ "$explicit" = "android" ] || [ "$explicit" = "ios" ] || [ "$explicit" = "web" ]; then
    echo "$explicit"; return
  fi

  local has_android=false has_ios=false

  if command -v adb &>/dev/null && adb devices 2>/dev/null | grep -qw "device"; then
    has_android=true
  fi

  if xcrun simctl list devices 2>/dev/null | grep -q "Booted"; then
    has_ios=true
  fi

  if $has_android && $has_ios; then
    echo "ERROR: Both iOS simulator and Android device connected." >&2
    echo "  Specify platform: scripts/agentic/screenshot.sh <label> <ios|android>" >&2
    echo "  Or set PLATFORM=ios|android env var." >&2
    exit 1
  fi

  if $has_android; then echo "android"; return; fi
  if $has_ios; then echo "ios"; return; fi

  echo "ERROR: No iOS simulator or Android device found." >&2
  exit 1
}

# -- iOS: Resolve simulator UDID ------------------------------------------
resolve_ios_udid() {
  local sim_name="${IOS_SIMULATOR:-}"

  # If a specific simulator name is given, try exact match on booted simulators
  if [ -n "$sim_name" ]; then
    local udid
    udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devs in data['devices'].items():
  for d in devs:
    if d['name'] == '$sim_name' and d['state'] == 'Booted':
      print(d['udid']); sys.exit(0)
sys.exit(1)
" 2>/dev/null) && echo "$udid" && return

    echo "WARNING: Could not find booted simulator '$sim_name'. Trying default booted device..." >&2
  fi

  # Fall back to first booted device
  local udid
  udid=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devs in data['devices'].items():
  for d in devs:
    if d['state'] == 'Booted':
      print(d['udid']); sys.exit(0)
sys.exit(1)
" 2>/dev/null) && echo "$udid" && return

  echo "ERROR: No booted iOS simulator found." >&2
  return 1
}

# -- iOS: Take screenshot --------------------------------------------------
take_screenshot_ios() {
  local filepath="$1"
  local udid
  udid=$(resolve_ios_udid) || exit 1
  xcrun simctl io "$udid" screenshot "$filepath" 2>/dev/null
}

# -- Android: Resolve device serial ----------------------------------------
resolve_android_device() {
  # ADB_SERIAL takes priority (explicit adb serial from `adb devices`)
  if [ -n "${ADB_SERIAL:-}" ]; then
    echo "$ADB_SERIAL"
  else
    # Auto-detect first connected device
    adb devices 2>/dev/null | awk '/\tdevice$/{print $1; exit}'
  fi
}

# -- Android: Take screenshot ----------------------------------------------
take_screenshot_android() {
  local filepath="$1"
  local device
  device=$(resolve_android_device)
  if [ -z "$device" ]; then
    echo "ERROR: No Android device/emulator found." >&2
    exit 1
  fi
  adb -s "$device" exec-out screencap -p > "$filepath"
}

# -- Take screenshot -------------------------------------------------------
FILENAME="${TIMESTAMP}_${LABEL}.png"
FILEPATH="$DIR/$FILENAME"

DETECTED_PLATFORM=$(detect_platform)

if [ "$DETECTED_PLATFORM" = "android" ]; then
  take_screenshot_android "$FILEPATH"
elif [ "$DETECTED_PLATFORM" = "web" ]; then
  # Delegate to web-browser.js screenshot command
  WEB_RESULT=$(node scripts/agentic/web-browser.js screenshot "$LABEL" 2>&1)
  if [ $? -eq 0 ] && [ -n "$WEB_RESULT" ]; then
    # web-browser.js returns the absolute path; copy to our expected location
    echo "$WEB_RESULT"
    exit 0
  else
    echo "ERROR: Web screenshot failed: $WEB_RESULT" >&2
    exit 1
  fi
else
  take_screenshot_ios "$FILEPATH"
fi

if [ ! -f "$FILEPATH" ] || [ ! -s "$FILEPATH" ]; then
  echo "ERROR: Screenshot failed. File not created or empty."
  exit 1
fi

# -- Cleanup old screenshots (keep last 20) --------------------------------
# shellcheck disable=SC2012
ls -t "$DIR"/*.png 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

# -- Output ----------------------------------------------------------------
ABSPATH="$(cd "$DIR" && pwd)/$FILENAME"
echo "$ABSPATH"
