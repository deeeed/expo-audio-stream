#!/bin/bash
# preflight.sh — Full environment setup for audiolab playground.
# Boots device, starts Metro, builds + installs app if needed, launches app.
#
# Must work non-interactively (called by automation that captures output).
#
# Environment:
#   PLATFORM         ios | android (default: auto-detect)
#   WATCHER_PORT     Metro port (default: 7365)
#   IOS_SIMULATOR    Simulator name (iOS only)
#   ADB_SERIAL       Emulator serial (Android only)

set -euo pipefail

cd "$(dirname "$0")/../.."

# Load device config from .env.development — only sets vars not already in env
# Priority: explicit env > .env.development > script defaults
if [ -f .env.development ]; then
  while IFS= read -r _line || [ -n "$_line" ]; do
    [[ "$_line" =~ ^[[:space:]]*(#|$) ]] && continue
    _line="${_line#export }"
    _key="${_line%%=*}"
    _key="${_key//[[:space:]]/}"
    [[ -n "$_key" && -z "${!_key+x}" ]] && export "$_line" 2>/dev/null || true
  done < .env.development
  unset _line _key
fi

PORT="${WATCHER_PORT:-7365}"
PLATFORM="${PLATFORM:-ios}"
SCHEME="audioplayground"
# Bundle IDs are dynamic based on APP_VARIANT (from .env.development)
_VARIANT="${APP_VARIANT:-development}"
_BASE="net.siteed.audioplayground"
if [ "$_VARIANT" = "production" ]; then
  BUNDLE_ID_IOS="$_BASE"
  BUNDLE_ID_ANDROID="$_BASE"
else
  BUNDLE_ID_IOS="${_BASE}.${_VARIANT}"
  BUNDLE_ID_ANDROID="${_BASE}.${_VARIANT}"
fi

info()  { echo "[preflight] $1"; }
pass()  { echo "[preflight] PASS $1"; }
fail()  { echo "[preflight] FAIL $1"; }

# ── 1. Boot device ──────────────────────────────────────────────
info "Step 1: Boot device (${PLATFORM})"
if [ "$PLATFORM" = "ios" ]; then
  # Determine device mode:
  #   - IOS_SIMULATOR explicitly empty (ios:device sets IOS_SIMULATOR=) → physical device preferred
  #   - IOS_SIMULATOR unset or non-empty → use simulator
  USE_IOS_PHYSICAL=false
  if [ "${IOS_SIMULATOR+set}" = "set" ] && [ -z "${IOS_SIMULATOR}" ]; then
    USE_IOS_PHYSICAL=true
  fi

  if [ "$USE_IOS_PHYSICAL" = true ]; then
    # Try to find a connected physical iOS device via xcrun devicectl
    IOS_PHYSICAL_UDID=""
    IOS_PHYSICAL_NAME=""
    if command -v xcrun &>/dev/null; then
      # devicectl (Xcode 15+) lists physical devices
      # Output format: Name   Hostname   Identifier   State   Model
      # Parse lines with "available" state (connected devices)
      IOS_PHYSICAL_LINE=$(xcrun devicectl list devices 2>/dev/null \
        | grep -E 'available' | grep -v 'Simulator' | head -1 || true)
      if [ -n "$IOS_PHYSICAL_LINE" ]; then
        # Extract UDID (8-4-4-4-12 hex pattern)
        IOS_PHYSICAL_UDID=$(echo "$IOS_PHYSICAL_LINE" \
          | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' \
          | head -1 || true)
        # Extract device name (first column before the long whitespace gap)
        IOS_PHYSICAL_NAME=$(echo "$IOS_PHYSICAL_LINE" | sed 's/  .*//' | sed 's/^ *//' || true)
      fi
    fi

    if [ -n "$IOS_PHYSICAL_UDID" ]; then
      IOS_DEVICE_UDID="$IOS_PHYSICAL_UDID"
      IOS_DEVICE_MODE="physical"
      pass "Physical iOS device detected: ${IOS_PHYSICAL_NAME:-unknown} (${IOS_DEVICE_UDID})"
    else
      # Fallback to default simulator
      info "No physical iOS device found — falling back to simulator"
      USE_IOS_PHYSICAL=false
      SIM="${IOS_SIMULATOR:-playground-1}"
    fi
  fi

  if [ "$USE_IOS_PHYSICAL" = false ]; then
    SIM="${IOS_SIMULATOR:-playground-1}"
    IOS_DEVICE_MODE="simulator"
    if ! xcrun simctl list devices 2>/dev/null | grep -q "${SIM}"; then
      fail "Simulator '${SIM}' does not exist — run farmslot setup-slot.sh first"
      exit 1
    fi
    if xcrun simctl list devices booted 2>/dev/null | grep -q "${SIM}"; then
      pass "Simulator ${SIM} already booted"
    else
      xcrun simctl boot "${SIM}" 2>/dev/null || true
      sleep 2
      pass "Simulator ${SIM} booted"
    fi
  fi
elif [ "$PLATFORM" = "android" ]; then
  # Determine device mode:
  #   - If ANDROID_DEVICE is set and non-empty → emulator AVD name
  #   - If ANDROID_DEVICE is unset → default emulator
  #   - If ANDROID_DEVICE is explicitly empty (android:device sets ANDROID_DEVICE=) → physical device
  USE_PHYSICAL=false
  if [ "${ANDROID_DEVICE+set}" = "set" ] && [ -z "${ANDROID_DEVICE}" ]; then
    USE_PHYSICAL=true
  fi

  if [ "$USE_PHYSICAL" = true ]; then
    # Auto-detect a connected physical device (skip emulators and WiFi ADB)
    SERIAL=$(adb devices 2>/dev/null | grep -E '^\S+\s+device$' | grep -v '^emulator-' | grep -v ':[0-9]*\s' | head -1 | awk '{print $1}')
    if [ -z "$SERIAL" ]; then
      info "No physical Android device found — falling back to emulator"
      USE_PHYSICAL=false
    else
      pass "Physical device detected: ${SERIAL}"
    fi
  fi

  if [ "$USE_PHYSICAL" = true ]; then
    # Set up reverse port forwarding for physical device
    adb -s "${SERIAL}" reverse --remove-all 2>/dev/null || true
    adb -s "${SERIAL}" reverse tcp:"${PORT}" tcp:"${PORT}" 2>/dev/null || true
    adb -s "${SERIAL}" reverse tcp:8081 tcp:"${PORT}" 2>/dev/null || true
  else
    SERIAL="${ADB_SERIAL:-emulator-5580}"
    AVD="${ANDROID_DEVICE:-audiolab}"
    EMU_PORT="${EMULATOR_PORT:-5580}"
    WINDOW_FLAG=""
    [ "${HEADLESS:-1}" = "1" ] && WINDOW_FLAG="-no-window"

    if adb devices 2>/dev/null | grep -q "${SERIAL}"; then
      # If running headless but we want windowed (or vice versa), restart
      EMULATOR_HAS_WINDOW=0
      if [ "${HEADLESS:-1}" = "0" ] && [ "$EMULATOR_HAS_WINDOW" = "0" ]; then
        info "Emulator ${SERIAL} is headless — restarting with window..."
        adb -s "${SERIAL}" emu kill 2>/dev/null || true
        sleep 2
        emulator -avd "$AVD" -port "$EMU_PORT"  -no-snapshot-load &>/dev/null &
        adb -s "${SERIAL}" wait-for-device
        until adb -s "${SERIAL}" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do sleep 2; done
        pass "Emulator ${AVD} restarted with window"
      else
        pass "Emulator ${SERIAL} already running"
      fi
    else
      info "Emulator ${SERIAL} not found — booting ${AVD}..."
      emulator -avd "$AVD" -port "$EMU_PORT" $WINDOW_FLAG  -no-snapshot-load &>/dev/null &
      sleep 5
      adb -s "${SERIAL}" wait-for-device
      SERIAL="emulator-${EMU_PORT}"
      until adb -s "${SERIAL}" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; do sleep 2; done
      pass "Emulator ${AVD} booted on ${SERIAL}"
    fi
    adb -s "${SERIAL}" reverse --remove-all 2>/dev/null || true
    adb -s "${SERIAL}" reverse tcp:"${PORT}" tcp:"${PORT}" 2>/dev/null || true
    adb -s "${SERIAL}" reverse tcp:8081 tcp:"${PORT}" 2>/dev/null || true
  fi
fi

# ── 2. Start Metro ─────────────────────────────────────────────
info "Step 2: Start Metro on port ${PORT}"
WATCHER_PORT="${PORT}" bash scripts/agentic/start-metro.sh

# ── 3. Build + install app if needed ───────────────────────────
info "Step 3: Check if app is installed"
# Default: always build. SKIP_BUILD=1 to skip (fast relaunch only).
APP_INSTALLED=false
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  if [ "$PLATFORM" = "ios" ] && [ "${IOS_DEVICE_MODE:-simulator}" = "physical" ]; then
    # For physical devices, check via devicectl
    if xcrun devicectl device info apps --device "${IOS_DEVICE_UDID}" 2>/dev/null | grep -q "${BUNDLE_ID_IOS}"; then
      APP_INSTALLED=true
      pass "App ${BUNDLE_ID_IOS} already installed on physical device ${IOS_DEVICE_UDID}"
    fi
  elif [ "$PLATFORM" = "ios" ]; then
    if xcrun simctl listapps "${SIM}" 2>/dev/null | grep -q "${BUNDLE_ID_IOS}"; then
      APP_INSTALLED=true
      pass "App ${BUNDLE_ID_IOS} already installed on ${SIM}"
    fi
  elif [ "$PLATFORM" = "android" ]; then
    if adb -s "${SERIAL}" shell pm list packages 2>/dev/null | grep -q "${BUNDLE_ID_ANDROID}"; then
      APP_INSTALLED=true
      pass "App ${BUNDLE_ID_ANDROID} already installed on ${SERIAL}"
    fi
  fi
fi

if [ "$APP_INSTALLED" = false ]; then
  info "App not installed — building..."

  info "Building workspace packages (audio-studio, playgroundapi, essentia)..."
  yarn build:deps

  if [ "$PLATFORM" = "ios" ] && [ "${IOS_DEVICE_MODE:-simulator}" = "physical" ]; then
    info "Building iOS app for physical device ${IOS_DEVICE_UDID}..."
    APP_VARIANT=development RCT_METRO_PORT="${PORT}" NODE_ENV=development \
      yarn expo run:ios --device "${IOS_DEVICE_UDID}" --no-bundler
    pass "iOS app built and installed on physical device"
  elif [ "$PLATFORM" = "ios" ]; then
    info "Building iOS app for simulator ${SIM}..."
    APP_VARIANT=development RCT_METRO_PORT="${PORT}" NODE_ENV=development \
      yarn expo run:ios --device "${SIM}" --no-bundler
    pass "iOS app built and installed"
  elif [ "$PLATFORM" = "android" ]; then
    info "Building Android app for ${SERIAL}..."
    # Build APK via Gradle (no device targeting — just compile)
    cd android && ./gradlew :app:assembleDebug && cd ..
    # Install to the specific emulator via adb -s
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ ! -f "$APK_PATH" ]; then
      fail "APK not found at $APK_PATH"
      exit 1
    fi
    adb -s "${SERIAL}" install -r "$APK_PATH"
    pass "Android app built and installed on ${SERIAL}"
  fi
fi

# ── 4. Launch via Expo dev client deep link ────────────────────
info "Step 4: Launch app on correct port (${PORT})"

# Determine Metro host:
#   - iOS simulator → localhost
#   - iOS physical device → LAN IP
#   - Android emulator → 10.0.2.2
#   - Android physical device → LAN IP
if [ "$PLATFORM" = "ios" ] && [ "${IOS_DEVICE_MODE:-simulator}" = "simulator" ]; then
  METRO_HOST="localhost"
elif [[ "${SERIAL:-}" == emulator-* ]]; then
  METRO_HOST="10.0.2.2"
else
  METRO_HOST=$(ipconfig getifaddr en0 2>/dev/null || echo localhost)
fi
ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://${METRO_HOST}:${PORT}', safe=''))")
DEV_CLIENT_URL="exp+${SCHEME}://expo-development-client/?url=${ENCODED_URL}"

if [ "$PLATFORM" = "ios" ] && [ "${IOS_DEVICE_MODE:-simulator}" = "physical" ]; then
  # Launch on physical device via devicectl with payload-url for dev client
  xcrun devicectl device process launch \
    --device "${IOS_DEVICE_UDID}" \
    --terminate-existing \
    --payload-url "${DEV_CLIENT_URL}" \
    "${BUNDLE_ID_IOS}" 2>/dev/null || true

  # Retry if app crashed on first launch
  sleep 5
  xcrun devicectl device process launch \
    --device "${IOS_DEVICE_UDID}" \
    --payload-url "${DEV_CLIENT_URL}" \
    "${BUNDLE_ID_IOS}" 2>/dev/null || true
  pass "App launched on physical device ${IOS_DEVICE_UDID} → ${METRO_HOST}:${PORT}"

elif [ "$PLATFORM" = "ios" ]; then
  # Suppress Expo dev menu onboarding popup
  xcrun simctl spawn "${SIM}" defaults write "${BUNDLE_ID_IOS}" EXDevMenuIsOnboardingFinished -bool YES 2>/dev/null || true
  xcrun simctl spawn "${SIM}" defaults write "${BUNDLE_ID_IOS}" EXDevMenuDisableAutoLaunch -bool YES 2>/dev/null || true

  xcrun simctl terminate "${SIM}" "${BUNDLE_ID_IOS}" 2>/dev/null || true
  sleep 1
  xcrun simctl openurl "${SIM}" "${DEV_CLIENT_URL}" 2>/dev/null || true

  # Retry if app crashed on first launch
  sleep 5
  if ! xcrun simctl spawn "${SIM}" launchctl list 2>/dev/null | grep -q "${BUNDLE_ID_IOS}"; then
    info "App exited after launch — retrying..."
    sleep 2
    xcrun simctl openurl "${SIM}" "${DEV_CLIENT_URL}" 2>/dev/null || true
  fi
  pass "App launched on ${SIM} → localhost:${PORT}"

elif [ "$PLATFORM" = "android" ]; then
  # Suppress Expo dev menu onboarding popup
  PREFS_DIR="/data/data/${BUNDLE_ID_ANDROID}/shared_prefs"
  PREFS_FILE="expo.modules.devmenu.sharedpreferences.xml"
  adb -s "${SERIAL}" shell "mkdir -p ${PREFS_DIR} && echo '<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?><map><boolean name=\"isOnboardingFinished\" value=\"true\" /></map>' > ${PREFS_DIR}/${PREFS_FILE}" 2>/dev/null || true

  adb -s "${SERIAL}" shell am force-stop "${BUNDLE_ID_ANDROID}" 2>/dev/null || true
  sleep 1
  adb -s "${SERIAL}" shell am start -a android.intent.action.VIEW -d "${DEV_CLIENT_URL}" 2>/dev/null || true

  # Retry if app crashed on first launch
  sleep 5
  if ! adb -s "${SERIAL}" shell pidof "${BUNDLE_ID_ANDROID}" >/dev/null 2>&1; then
    info "App exited after launch — retrying..."
    sleep 2
    adb -s "${SERIAL}" shell am start -a android.intent.action.VIEW -d "${DEV_CLIENT_URL}" 2>/dev/null || true
  fi
  pass "App launched on ${SERIAL} → localhost:${PORT}"
fi

# ── 5. Wait for CDP / health ──────────────────────────────────
info "Step 5: Wait for app health (CDP)"
HEALTH_TIMEOUT=90
ELAPSED=0
while [ $ELAPSED -lt $HEALTH_TIMEOUT ]; do
  HEALTH=$(WATCHER_PORT="${PORT}" node scripts/agentic/cdp-bridge.mjs get-route 2>/dev/null || true)
  if [ -n "$HEALTH" ] && echo "$HEALTH" | grep -q '"pathname"'; then
    pass "App responding via CDP after ${ELAPSED}s"
    echo "$HEALTH"
    exit 0
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

info "App did not respond via CDP within ${HEALTH_TIMEOUT}s — Metro is running, app may need manual interaction"
exit 0
