#!/bin/bash

set -e

# Description: This script automates the process of generating screenshots for iOS and Android.
# Usage: ./script_name.sh [options]

FORCE_BUILD=0
GENERATE_IOS=0
GENERATE_ANDROID=0

# Ensure the script operates from the root directory of the project
reldir="$( dirname -- "$0"; )";
cd "$reldir/..";

# Display help message
display_help() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  force           Force rebuild even if builds exist."
    echo "  ios             Generate iOS screenshots only."
    echo "  android         Generate Android screenshots only."
    echo "  all             Generate both iOS and Android screenshots."
    echo "  help            Display this help message."
    exit 1
}

if [[ $# -eq 0 ]]; then
    display_help
fi

# Parse arguments
for arg in "$@"
do
    case $arg in
        force)
        FORCE_BUILD=1
        ;;
        ios)
        GENERATE_IOS=1
        ;;
        android)
        GENERATE_ANDROID=1
        ;;
        all)
        GENERATE_IOS=1
        GENERATE_ANDROID=1
        ;;
        help)
        display_help
        ;;
    esac
done

# If no specific option is provided, default to generating both iOS and Android screenshots
if [[ $GENERATE_IOS -eq 0 && $GENERATE_ANDROID -eq 0 ]]; then
    GENERATE_IOS=1
    GENERATE_ANDROID=1
fi

# Function to check if a file exists
file_exists() {
    if [[ (! -f "$1" && ! -d "$1") || $FORCE_BUILD -eq 1 ]]; then
        return 1
    else
        return 0
    fi
}


generate_ios_screenshots() {
    echo "$(date): Generating iOS screenshots..."

    if file_exists "./ios/build/Build/Products/Debug-iphonesimulator/AudioDevPlayground.app"; then
        echo "$(date): iOS release build exists. Skipping..."
    else
        echo "build not found --- creating new one"
        yarn ios:build:debug
    fi

    # Use iPhone 15 models instead of iPhone 16
    yarn detox test -c ios.sim.debug e2e/screenshots.test.ts
    yarn detox test -c ios.iphone15ProMax.debug e2e/screenshots.test.ts
    yarn detox test -c ios.iPadPro.debug e2e/screenshots.test.ts
    yarn detox test -c ios.iphone15.debug e2e/screenshots.test.ts

    echo "$(date): Framing iOS screenshots..."
    # fastlane ios frame # disabled for now since it changes the format of the image
}

generate_android_screenshots() {
    echo "$(date): Generating Android screenshots..."

    # if file_exists "android/app/build/outputs/apk/release/app-release.apk"; then
    if file_exists "android/app/build/outputs/apk/debug/AudioDevPlayground-debug.apk"; then
        echo "$(date): Android release build exists. Skipping..."
    else
        echo "build not found --- creating new one"
        yarn android:build:debug
        # yarn android:build:release
    fi

    yarn detox test -c android.emu.debug e2e/screenshots.test.ts
    # yarn detox test -c android.emu.release e2e/screenshots.test.ts
}


remove_alpha_channel() {
    local dir="$1"
    echo "$(date): Removing alpha channel from screenshots in $dir..."
    for screenshot in "$dir"/*.png; do
        convert "$screenshot" -alpha off "$screenshot"
    done
    echo "$(date): Alpha channel removed successfully from screenshots in $dir!"
}

# Main execution
if [[ $GENERATE_IOS -eq 1 ]]; then
    generate_ios_screenshots
    remove_alpha_channel "./fastlane/detox/ios"
fi

if [[ $GENERATE_ANDROID -eq 1 ]]; then
    generate_android_screenshots
    remove_alpha_channel "./fastlane/detox/android"
fi

echo "$(date): Script completed successfully!"