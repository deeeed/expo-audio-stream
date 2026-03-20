#!/bin/bash
# device-cmd.sh — send a command to connected React Native devices.
#
# Usage:
#   device-cmd.sh [--device <name>] <command>
#
# Commands:
#   reload      — reload JS bundle on device(s)
#   debug       — open Hermes debugger / React Native DevTools
#   dev-menu    — open React Native developer menu
#   suppress-onboarding — suppress Expo dev menu onboarding (via CDP)
#   dismiss     — dismiss Expo dev menu / onboarding modal
#
# --device <name>  case-insensitive substring match on deviceName (optional)
# --platform ios|android  platform filter for dismiss command (optional, default: all)

set -euo pipefail
APP_ROOT="${APP_ROOT:-$(pwd)}"
source "$(cd "$APP_ROOT" && git rev-parse --show-toplevel)/scripts/agentic/_lib.sh"
cd "$APP_ROOT"

DEVICE_FLAG=()
PLATFORM="all"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --device) DEVICE_FLAG=(--device "$2"); shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    *) CMD="$1"; shift ;;
  esac
done

export WATCHER_PORT="$PORT"

case "${CMD:-}" in
  reload)
    node "${APP_ROOT}/scripts/agentic/cdp-bridge.mjs" "${DEVICE_FLAG[@]}" reload
    ;;

  debug|open-debugger)
    if curl -sf -X POST "http://localhost:${PORT}/open-debugger" >/dev/null 2>&1; then
      echo '{"opened":true,"method":"metro-http"}'
    else
      echo "[device-cmd] Metro HTTP failed, falling back to CDP eval" >&2
      node "${APP_ROOT}/scripts/agentic/cdp-bridge.mjs" "${DEVICE_FLAG[@]}" eval \
        "NativeModules?.DevSettings?.openDebugger?.() ?? 'not supported'"
    fi
    ;;

  dev-menu|devmenu)
    if curl -sf -X POST "http://localhost:${PORT}/open-dev-menu" >/dev/null 2>&1; then
      echo '{"opened":true,"method":"metro-http"}'
    else
      echo "[device-cmd] Metro HTTP failed, falling back to CDP eval" >&2
      node "${APP_ROOT}/scripts/agentic/cdp-bridge.mjs" "${DEVICE_FLAG[@]}" eval \
        "NativeModules?.DevSettings?.show?.() ?? 'not supported'"
    fi
    ;;

  suppress-onboarding)
    node "${APP_ROOT}/scripts/agentic/cdp-bridge.mjs" "${DEVICE_FLAG[@]}" eval \
      "require('expo-modules-core').NativeModulesProxy.DevMenuPreferences.setPreferencesAsync({isOnboardingFinished: true, showsAtLaunch: false})" \
      2>/dev/null && echo '{"suppressed":true}' || echo '{"suppressed":false,"error":"CDP eval failed"}'
    ;;

  dismiss-dev-menu|dismiss)
    dismissed=false
    if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "all" ]]; then
      sim_devices=$(xcrun simctl list devices booted 2>/dev/null | grep "Booted" | sed 's/.*(\(.*\)) (Booted).*/\1/')
      if [[ -n "$sim_devices" ]]; then
        while IFS= read -r udid; do
          xcrun simctl spawn "$udid" defaults write "$BUNDLE_ID" EXDevMenuIsOnboardingFinished -bool YES 2>/dev/null || true
          xcrun simctl spawn "$udid" defaults write "$BUNDLE_ID" EXDevMenuDisableAutoLaunch -bool YES 2>/dev/null || true
        done <<< "$sim_devices"
      fi
      if osascript -e 'tell application "Simulator" to activate' -e 'delay 0.3' -e 'tell application "System Events" to key code 53' 2>/dev/null; then
        dismissed=true
        echo '{"dismissed":true,"platform":"ios","method":"escape"}' >&2
      else
        dismissed=true
        echo '{"dismissed":true,"platform":"ios","method":"defaults-only","note":"grant Accessibility to Terminal for Escape key dismiss"}' >&2
      fi
    fi
    if [[ "$PLATFORM" == "android" || "$PLATFORM" == "all" ]]; then
      local_devices=$(adb devices 2>/dev/null | grep -E "^\S+\s+(device)$" | awk '{print $1}')
      if [[ -n "$local_devices" ]]; then
        while IFS= read -r serial; do
          adb -s "$serial" shell input keyevent KEYCODE_BACK 2>/dev/null || true
          dismissed=true
          echo "{\"dismissed\":true,\"platform\":\"android\",\"device\":\"$serial\",\"method\":\"back\"}" >&2
        done <<< "$local_devices"
      fi
    fi
    if [[ "$dismissed" == "true" ]]; then
      echo '{"dismissed":true}'
    else
      echo '{"dismissed":false,"error":"no devices found"}'
    fi
    ;;

  *)
    echo "Usage: device-cmd.sh [--device <name>] [--platform ios|android] <command>"
    echo ""
    echo "Commands:"
    echo "  reload          Reload the JS bundle"
    echo "  debug           Open React Native debugger / Hermes DevTools"
    echo "  dev-menu        Open the React Native developer menu"
    echo "  suppress-onboarding  Suppress Expo dev menu onboarding (via CDP, works on any device)"
    echo "  dismiss         Dismiss Expo dev menu / onboarding modal"
    exit 1
    ;;
esac
