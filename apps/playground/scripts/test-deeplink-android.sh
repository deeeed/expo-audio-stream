#!/bin/bash

# Test Deep Link on Android Device/Emulator
# Usage: ./test-deeplink-android.sh "sampleRate=44100&channels=1&encoding=pcm_16bit"

set -e

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android SDK and add adb to PATH"
    exit 1
fi

# Check if device/emulator is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device or emulator connected"
    echo "   Connect a device or start an emulator first"
    exit 1
fi

# Get the app variant to determine package name and scheme
APP_VARIANT=${APP_VARIANT:-development}
case $APP_VARIANT in
    production)
        PACKAGE_NAME="net.siteed.audioplayground"
        APP_SCHEME="audioplayground"
        ;;
    *)
        PACKAGE_NAME="net.siteed.audioplayground.$APP_VARIANT"
        APP_SCHEME="audioplayground"
        ;;
esac

# Get parameters from command line or use defaults  
PARAMS=${1:-"sampleRate=44100&channels=1&encoding=pcm_16bit"}

# Construct deep link URL
DEEP_LINK="$APP_SCHEME://agent-validation?$PARAMS"

echo "🚀 Testing Deep Link on Android..."
echo "   Package: $PACKAGE_NAME"
echo "   URL: $DEEP_LINK"
echo ""

# Check if app is installed
if ! adb shell pm list packages | grep -q "$PACKAGE_NAME"; then
    echo "❌ App not installed: $PACKAGE_NAME"
    echo "   Build and install the app first:"
    echo "   yarn android"
    exit 1
fi

# Send deep link intent
echo "📱 Sending deep link intent..."
echo "   Command: adb shell am start -W -a android.intent.action.VIEW -d \"$DEEP_LINK\""
echo ""

RESULT=$(adb shell am start \
    -W \
    -a android.intent.action.VIEW \
    -d "$DEEP_LINK" 2>&1)

echo "Response:"
echo "$RESULT"
echo ""

if echo "$RESULT" | grep -q "Status: ok"; then
    echo "✅ Deep link sent successfully!"
    echo "   The app should now open the agent validation screen"
    echo "   with the specified configuration."
else
    echo "❌ Failed to send deep link or app didn't respond as expected"
    echo "   Check if the app is installed and the URL scheme is registered"
    exit 1
fi 