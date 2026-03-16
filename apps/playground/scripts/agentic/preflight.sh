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

# Load device config from .env.development (gitignored, machine-specific)
if [ -f .env.development ]; then
  set -o allexport
  source .env.development
  set +o allexport
fi

PORT="${WATCHER_PORT:-7365}"
PLATFORM="${PLATFORM:-ios}"
SCHEME="audioplayground"
BUNDLE_ID_IOS="net.siteed.audioplayground.development"
BUNDLE_ID_ANDROID="net.siteed.audioplayground.development"

info()  { echo "[preflight] $1"; }
pass()  { echo "[preflight] PASS $1"; }
fail()  { echo "[preflight] FAIL $1"; }

# ── 1. Boot device ──────────────────────────────────────────────
info "Step 1: Boot device (${PLATFORM})"
if [ "$PLATFORM" = "ios" ]; then
  SIM="${IOS_SIMULATOR:-playground-1}"
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
elif [ "$PLATFORM" = "android" ]; then
  SERIAL="${ADB_SERIAL:-emulator-5560}"
  if adb devices 2>/dev/null | grep -q "${SERIAL}"; then
    pass "Emulator ${SERIAL} already running"
  else
    info "Emulator ${SERIAL} not found — booting ${ANDROID_DEVICE:-audiolab}..."
    AVD="${ANDROID_DEVICE:-audiolab}"
    PORT="${EMULATOR_PORT:-5580}"
    WINDOW_FLAG="-no-window"
    [ "${SHOW_WINDOW:-0}" = "1" ] && WINDOW_FLAG=""
    emulator -avd "$AVD" -port "$PORT" $WINDOW_FLAG -no-audio -no-snapshot-load &>/dev/null &
    sleep 5
    adb -s "emulator-${PORT}" wait-for-device
    SERIAL="emulator-${PORT}"
    ok "Emulator ${AVD} booted on emulator-${PORT}"
  fi
  adb -s "${SERIAL}" reverse --remove-all 2>/dev/null || true
  adb -s "${SERIAL}" reverse tcp:"${PORT}" tcp:"${PORT}" 2>/dev/null || true
  adb -s "${SERIAL}" reverse tcp:8081 tcp:"${PORT}" 2>/dev/null || true
fi

# ── 2. Start Metro ─────────────────────────────────────────────
info "Step 2: Start Metro on port ${PORT}"
WATCHER_PORT="${PORT}" bash scripts/agentic/start-metro.sh

# ── 3. Build + install app if needed ───────────────────────────
info "Step 3: Check if app is installed"
APP_INSTALLED=false

if [ "$PLATFORM" = "ios" ]; then
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

if [ "$APP_INSTALLED" = false ]; then
  info "App not installed — building..."

  if [ ! -d "../../packages/audio-studio/build" ]; then
    info "Building workspace packages..."
    yarn build:deps
  fi

  if [ "$PLATFORM" = "ios" ]; then
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

# Use 10.0.2.2 for emulators, LAN IP for physical devices
if [[ "${SERIAL:-}" == emulator-* ]]; then
  METRO_HOST="10.0.2.2"
else
  METRO_HOST=$(ipconfig getifaddr en0 2>/dev/null || echo localhost)
fi
ENCODED_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://${METRO_HOST}:${PORT}', safe=''))")
DEV_CLIENT_URL="exp+${SCHEME}://expo-development-client/?url=${ENCODED_URL}"

if [ "$PLATFORM" = "ios" ]; then
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
