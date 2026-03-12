#!/bin/bash

set -e

FORCE_BUILD=0
GENERATE_IOS=0
GENERATE_ANDROID=0
APP_VARIANT=${APP_VARIANT:-production}
ENV_FILE="env"

# Ensure the script operates from the root directory of the project
reldir="$( dirname -- "$0"; )";
cd "$reldir/..";

# Get app version from package.json
APP_VERSION=$(grep -o '"version": *"[^"]*"' package.json | cut -d'"' -f4)
if [ -z "$APP_VERSION" ]; then
    echo "Error: Could not determine app version from package.json"
    exit 1
fi
echo "Detected app version: $APP_VERSION"

IOS_SCREENSHOTS_DIR="./fastlane/detox/ios/v${APP_VERSION}"
ANDROID_SCREENSHOTS_DIR="./fastlane/detox/android/v${APP_VERSION}"

get_imagemagick_command() {
    if command -v magick &> /dev/null; then
        echo "magick"
    else
        echo "convert"
    fi
}

IMAGEMAGICK_CMD=$(get_imagemagick_command)

display_help() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  force           Force rebuild even if builds exist."
    echo "  ios             Generate iOS screenshots only."
    echo "  android         Generate Android screenshots only."
    echo "  all             Generate both iOS and Android screenshots."
    echo "  env=<filename>  Specify .env file (e.g., env=production for .env.production)."
    echo "  help            Display this help message."
    exit 1
}

check_dependencies() {
    echo "Checking required dependencies..."
    if ! command -v "$IMAGEMAGICK_CMD" &> /dev/null; then
        echo "ERROR: ImageMagick not found. Install with: brew install imagemagick"
        exit 1
    else
        echo "ImageMagick found."
    fi
}

if [[ $# -eq 0 ]]; then
    display_help
fi

for arg in "$@"
do
    case $arg in
        force) FORCE_BUILD=1 ;;
        ios) GENERATE_IOS=1 ;;
        android) GENERATE_ANDROID=1 ;;
        all) GENERATE_IOS=1; GENERATE_ANDROID=1 ;;
        env=*) ENV_FILE="${arg#*=}" ;;
        help) display_help ;;
    esac
done

check_dependencies

if [[ $GENERATE_IOS -eq 0 && $GENERATE_ANDROID -eq 0 ]]; then
    GENERATE_IOS=1
    GENERATE_ANDROID=1
fi

# Load environment
if [ -f ".env.${ENV_FILE}" ]; then
    echo "Loading environment from .env.${ENV_FILE}"
    export $(grep -v '^#' .env.${ENV_FILE} | xargs)
elif [ -f ".env" ] && [ "$ENV_FILE" = "env" ]; then
    echo "Loading environment from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "Warning: No .env file found, continuing without environment variables"
fi

echo "Using APP_VARIANT=${APP_VARIANT}"

# Determine app name based on APP_VARIANT
if [[ "$APP_VARIANT" == "production" ]]; then
    APP_NAME="SherpaVoice"
else
    APP_NAME="SherpaVoiceDev"
fi

file_exists() {
    if [[ (! -f "$1" && ! -d "$1") || $FORCE_BUILD -eq 1 ]]; then
        return 1
    else
        return 0
    fi
}

screenshots_exist() {
    local dir="$1"
    if [[ -d "$dir" && $(find "$dir" -name "*.png" | wc -l) -gt 0 && $FORCE_BUILD -eq 0 ]]; then
        return 0
    else
        return 1
    fi
}

build_android_direct() {
    echo "$(date): Building Android app using Gradle..."
    cd android
    if [[ "$APP_VARIANT" == "production" ]]; then
        NODE_ENV=production APP_VARIANT=production ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release
    else
        APP_VARIANT=development ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release
    fi
    build_status=$?
    cd ..

    if [[ $build_status -eq 0 ]]; then
        STANDARD_APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        VERSIONED_APK_ROOT="${APP_NAME}-${APP_VERSION}-${APP_VARIANT}.apk"
        if [[ -f "$STANDARD_APK_PATH" ]]; then
            cp "$STANDARD_APK_PATH" "./$VERSIONED_APK_ROOT"
            echo "Versioned APK: $VERSIONED_APK_ROOT"
        fi
    fi

    return $build_status
}

generate_ios_screenshots() {
    echo "$(date): Generating iOS screenshots using app: $APP_NAME (variant: $APP_VARIANT)"

    if screenshots_exist "$IOS_SCREENSHOTS_DIR"; then
        echo "$(date): iOS screenshots for version $APP_VERSION already exist. Use 'force' to regenerate."
        return
    fi

    if [ ! -d "./ios/$APP_NAME.xcworkspace" ]; then
        echo "ERROR: Could not find iOS workspace for $APP_NAME"
        echo "Run: APP_VARIANT=$APP_VARIANT yarn expo prebuild --clean"
        exit 1
    fi

    if file_exists "./ios/build/Build/Products/Release-iphonesimulator/$APP_NAME.app"; then
        echo "$(date): iOS build exists. Skipping..."
    else
        echo "Building iOS app..."
        pushd ios > /dev/null
        xcodebuild -workspace "$APP_NAME.xcworkspace" -scheme "$APP_NAME" -configuration Release -sdk iphonesimulator -derivedDataPath build
        popd > /dev/null
    fi

    mkdir -p "$IOS_SCREENSHOTS_DIR"
    rm -f "./fastlane/detox/ios/latest"
    ln -sf "v${APP_VERSION}" "./fastlane/detox/ios/latest"

    export DETOX_ARTIFACTS_LOCATION="$IOS_SCREENSHOTS_DIR"

    echo "$(date): Generating iPhone screenshots (iPhone 16 Pro Max)"
    APP_VARIANT=$APP_VARIANT yarn detox test -c ios.sim.release e2e/screenshots.test.ts

    echo "$(date): Generating iPad screenshots (iPad Pro 13-inch M4)"
    APP_VARIANT=$APP_VARIANT yarn detox test -c ios.iPadPro.release e2e/screenshots.test.ts

    echo "App: $APP_NAME ($APP_VARIANT)" > "$IOS_SCREENSHOTS_DIR/version_info.txt"
    echo "Version: $APP_VERSION" >> "$IOS_SCREENSHOTS_DIR/version_info.txt"
    echo "Generated: $(date)" >> "$IOS_SCREENSHOTS_DIR/version_info.txt"
}

detect_android_avd() {
    if [[ -n "$ANDROID_AVD" ]]; then
        echo "$ANDROID_AVD"
        return
    fi

    local ANDROID_SDK=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
    if [[ -z "$ANDROID_SDK" ]]; then
        echo "medium"
        return
    fi

    local EMULATOR="$ANDROID_SDK/emulator/emulator"
    if [[ ! -f "$EMULATOR" ]]; then
        echo "medium"
        return
    fi

    local AVDS=$("$EMULATOR" -list-avds 2>/dev/null)
    if echo "$AVDS" | grep -q "medium"; then
        echo "medium"
    else
        # Use the first available AVD
        local FIRST_AVD=$(echo "$AVDS" | head -1)
        if [[ -n "$FIRST_AVD" ]]; then
            echo "WARNING: AVD 'medium' not found, using '$FIRST_AVD'" >&2
            echo "$FIRST_AVD"
        else
            echo "medium"
        fi
    fi
}

generate_android_screenshots() {
    echo "$(date): Generating Android screenshots using app: $APP_NAME (variant: $APP_VARIANT)"

    if screenshots_exist "$ANDROID_SCREENSHOTS_DIR"; then
        echo "$(date): Android screenshots for version $APP_VERSION already exist. Use 'force' to regenerate."
        return
    fi

    STANDARD_APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    TEST_APK_PATH="android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk"

    if [[ -f "$STANDARD_APK_PATH" && -f "$TEST_APK_PATH" && $FORCE_BUILD -eq 0 ]]; then
        echo "$(date): Android APK builds exist. Skipping build..."
    else
        echo "Building Android app..."
        build_android_direct
        if [[ $? -ne 0 ]]; then
            echo "Error: Failed to build Android app"
            exit 1
        fi
    fi

    mkdir -p "$ANDROID_SCREENSHOTS_DIR"
    rm -f "./fastlane/detox/android/latest"
    ln -sf "v${APP_VERSION}" "./fastlane/detox/android/latest"

    local AVD_NAME=$(detect_android_avd)
    echo "$(date): Using Android AVD: $AVD_NAME"

    export DETOX_ARTIFACTS_LOCATION="$ANDROID_SCREENSHOTS_DIR"
    ANDROID_AVD=$AVD_NAME APP_VARIANT=$APP_VARIANT yarn detox test -c android.emu.release e2e/screenshots.test.ts

    echo "App: $APP_NAME ($APP_VARIANT)" > "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    echo "Version: $APP_VERSION" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    echo "AVD: $AVD_NAME" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    echo "Generated: $(date)" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
}

organize_screenshots() {
    local version_dir="$1"
    local platform="$2"
    local output_dir="${version_dir}/final"
    local version=$(basename "$version_dir" | sed 's/^v//')

    echo "$(date): Organizing $platform screenshots..."
    mkdir -p "$output_dir"

    if [[ "$platform" == "ios" ]]; then
        local iphone_dir=$(find "$version_dir" -maxdepth 1 -type d -name "ios.sim.release.*" | sort | tail -n 1)
        local ipad_dir=$(find "$version_dir" -maxdepth 1 -type d -name "ios.iPadPro.release.*" | sort | tail -n 1)

        if [ -n "$iphone_dir" ]; then
            process_device_screenshots "$iphone_dir" "$output_dir" "iphone" "$platform" "$version"
        fi
        if [ -n "$ipad_dir" ]; then
            process_device_screenshots "$ipad_dir" "$output_dir" "ipad-pro" "$platform" "$version"
        fi
    else
        local android_dir=$(find "$version_dir" -maxdepth 1 -type d -name "android.emu.release.*" | sort | tail -n 1)
        if [ -n "$android_dir" ]; then
            process_device_screenshots "$android_dir" "$output_dir" "android-phone" "$platform" "$version"
        fi
    fi

    mkdir -p "./screenshots/v${version}"
    cp "$output_dir/version_info.txt" "./screenshots/v${version}/" 2>/dev/null || true
}

process_device_screenshots() {
    local device_dir="$1"
    local output_dir="$2"
    local device_type="$3"
    local platform="$4"
    local version="$5"

    echo "Processing screenshots for $device_type from $(basename "$device_dir")"

    mkdir -p "$output_dir/$device_type"
    mkdir -p "./screenshots/v${version}/$platform/$device_type"

    rm -f "$output_dir/$device_type"/*.png

    local counter=1
    if [ -d "$device_dir" ]; then
        # Tab screenshots
        for tab in home features models about; do
            find "$device_dir" -name "${tab}-tab.png" -type f | while read -r file; do
                local num=$(printf "%02d" $counter)
                cp "$file" "$output_dir/$device_type/${num}-${tab}-tab.png"
                echo "Saved: ${num}-${tab}-tab.png"
            done
            counter=$((counter + 1))
        done

        # Feature detail screenshots
        for feature in asr tts; do
            find "$device_dir" -name "feature-${feature}.png" -type f | while read -r file; do
                local num=$(printf "%02d" $counter)
                cp "$file" "$output_dir/$device_type/${num}-feature-${feature}.png"
                echo "Saved: ${num}-feature-${feature}.png"
            done
            counter=$((counter + 1))
        done

        # Copy all to permanent directory
        cp -f "$output_dir/$device_type"/*.png "./screenshots/v${version}/$platform/$device_type/" 2>/dev/null || true
    fi
}

remove_alpha_channel() {
    local version_dir="$1"
    local platform="$2"
    echo "$(date): Removing alpha channel from $platform screenshots..."

    local final_dir="${version_dir}/final"
    if [ ! -d "$final_dir" ]; then
        return
    fi

    local screenshots=$(find "$final_dir" -name "*.png" 2>/dev/null)
    if [ -z "$screenshots" ]; then
        return
    fi

    echo "$screenshots" | while read -r screenshot; do
        if [ "$IMAGEMAGICK_CMD" = "magick" ]; then
            magick "$screenshot" -alpha off "$screenshot"
        else
            convert "$screenshot" -alpha off "$screenshot"
        fi
    done

    # Also process permanent directory
    local version=$(basename "$version_dir" | sed 's/^v//')
    local perm_dir="./screenshots/v${version}/$platform"
    if [ -d "$perm_dir" ]; then
        find "$perm_dir" -name "*.png" -type f | while read -r screenshot; do
            if [ "$IMAGEMAGICK_CMD" = "magick" ]; then
                magick "$screenshot" -alpha off "$screenshot" 2>/dev/null || true
            else
                convert "$screenshot" -alpha off "$screenshot" 2>/dev/null || true
            fi
        done
    fi

    echo "$(date): Alpha channel removed."
}

# Main execution
if [[ $GENERATE_IOS -eq 1 ]]; then
    generate_ios_screenshots
    organize_screenshots "$IOS_SCREENSHOTS_DIR" "ios"
    remove_alpha_channel "$IOS_SCREENSHOTS_DIR" "ios"
fi

if [[ $GENERATE_ANDROID -eq 1 ]]; then
    generate_android_screenshots
    organize_screenshots "$ANDROID_SCREENSHOTS_DIR" "android"
    remove_alpha_channel "$ANDROID_SCREENSHOTS_DIR" "android"
fi

echo "$(date): Screenshot generation completed!"
echo ""
echo "Organized screenshots:"
find ./screenshots -maxdepth 1 -name "v*" -type d 2>/dev/null | sort -V | while read -r dir; do
    version=$(basename "$dir")
    ios_count=$(find "$dir/ios" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    android_count=$(find "$dir/android" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
    echo "  - $version (iOS: $ios_count, Android: $android_count screenshots)"
done
echo ""
echo "$(date): Done!"
