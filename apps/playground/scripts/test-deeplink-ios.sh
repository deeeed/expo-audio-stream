#!/bin/bash

# Test Deep Link on iOS Simulator
# Usage: ./test-deeplink-ios.sh "sampleRate=44100&channels=1&encoding=pcm_16bit"

set -e

run_simctl_timeout() {
    python3 - "$@" <<'PY'
import subprocess
import sys

cmd = ["xcrun", "simctl", *sys.argv[1:]]
try:
    completed = subprocess.run(cmd, check=False, timeout=15)
except subprocess.TimeoutExpired:
    sys.exit(124)
sys.exit(completed.returncode)
PY
}

# Check if xcrun is available (macOS only)
if ! command -v xcrun &> /dev/null; then
    echo "❌ xcrun not found. This script only works on macOS with Xcode installed"
    exit 1
fi

# Check if iOS Simulator is running
if ! xcrun simctl list devices | grep -q "Booted"; then
    echo "❌ No iOS simulator is currently booted"
    echo "   Start a simulator first:"
    echo "   xcrun simctl boot 'iPhone 15'"
    echo "   open -a Simulator"
    exit 1
fi

# Get the app variant to determine scheme
APP_VARIANT=${APP_VARIANT:-development}
case $APP_VARIANT in
    production)
        APP_SCHEME="audioplayground"
        ;;
    *)
        APP_SCHEME="audioplayground"
        ;;
esac

# Get parameters from command line or use defaults
PARAMS=${1:-"sampleRate=44100&channels=1&encoding=pcm_16bit"}

# Construct deep link URL
DEEP_LINK="$APP_SCHEME://agent-validation?$PARAMS"

echo "🚀 Testing Deep Link on iOS Simulator..."
echo "   URL: $DEEP_LINK"
echo ""

# Get the booted device UDID
DEVICE_UDID=$(xcrun simctl list devices | grep "Booted" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
echo "📱 Target simulator: $DEVICE_UDID"

# Check if app is installed (simplified check)
APP_VARIANT=${APP_VARIANT:-development}
case $APP_VARIANT in
    production)
        BUNDLE_ID="net.siteed.audioplayground"
        ;;
    *)
        BUNDLE_ID="net.siteed.audioplayground.$APP_VARIANT"
        ;;
esac

echo "   Bundle ID: $BUNDLE_ID"

# Send deep link to simulator
echo "📱 Sending deep link to simulator..."
run_simctl_timeout openurl booted "$DEEP_LINK"

if [ $? -eq 0 ]; then
    echo "✅ Deep link sent successfully!"
    echo "   The app should now open the agent validation screen"
    echo "   with the specified configuration."
    echo ""
    echo "💡 If the app doesn't open, make sure it's installed:"
    echo "   yarn ios"
else
    echo "❌ Failed to send deep link"
    echo "💡 Possible solutions:"
    echo "   1. Install the app: yarn ios"
    echo "   2. Check if the correct simulator is running"
    echo "   3. Verify the app scheme is registered correctly"
    exit 1
fi
