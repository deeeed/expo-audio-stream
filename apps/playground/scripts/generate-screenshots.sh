#!/bin/bash

set -e

# Description: This script automates the process of generating screenshots for iOS and Android.
# Usage: ./script_name.sh [options]

FORCE_BUILD=0
GENERATE_IOS=0
GENERATE_ANDROID=0
APP_VARIANT=${APP_VARIANT:-preview}
ENV_FILE="env"  # Default to .env

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

# Define version-specific screenshot directories
IOS_SCREENSHOTS_DIR="./fastlane/detox/ios/v${APP_VERSION}"
ANDROID_SCREENSHOTS_DIR="./fastlane/detox/android/v${APP_VERSION}"

# Get the appropriate ImageMagick command (magick for v7+, convert for older versions)
get_imagemagick_command() {
    if command -v magick &> /dev/null; then
        echo "magick"
    else
        echo "convert"
    fi
}

IMAGEMAGICK_CMD=$(get_imagemagick_command)

# Display help message
display_help() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  force           Force rebuild even if builds exist."
    echo "  ios             Generate iOS screenshots only."
    echo "  android         Generate Android screenshots only."
    echo "  all             Generate both iOS and Android screenshots."
    echo "  env=<filename>  Specify .env file to use without the .env prefix (e.g., env=production for .env.production)."
    echo "                  Default is 'env' which loads the .env file."
    echo "  help            Display this help message."
    exit 1
}

# Check for ImageMagick (required for processing screenshots)
check_dependencies() {
    echo "Checking required dependencies..."
    
    # Check for ImageMagick
    if ! command -v "$IMAGEMAGICK_CMD" &> /dev/null; then
        echo "ERROR: ImageMagick not found. This is required for processing screenshots."
        echo "Please install ImageMagick before continuing."
        echo ""
        echo "On macOS, you can install it with:"
        echo "  brew install imagemagick"
        echo ""
        echo "On Linux, use your package manager. For example:"
        echo "  sudo apt-get install imagemagick"
        echo ""
        echo "On Windows, download from: https://imagemagick.org/script/download.php"
        exit 1
    else
        if [ "$IMAGEMAGICK_CMD" = "magick" ]; then
            echo "✅ ImageMagick found: $(magick --version | head -n 1)"
        else
            echo "✅ ImageMagick found: $(convert --version | head -n 1)"
            echo "Note: Using legacy 'convert' command. For ImageMagick v7+, 'magick' is recommended."
        fi
    fi
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
        env=*)
        ENV_FILE="${arg#*=}"
        ;;
        help)
        display_help
        ;;
    esac
done

# Check for required dependencies before proceeding
check_dependencies

# If no specific option is provided, default to generating both iOS and Android screenshots
if [[ $GENERATE_IOS -eq 0 && $GENERATE_ANDROID -eq 0 ]]; then
    GENERATE_IOS=1
    GENERATE_ANDROID=1
fi

# Simple environment variable loading
if [ -f ".env.${ENV_FILE}" ]; then
    echo "Loading environment from .env.${ENV_FILE}"
    export $(grep -v '^#' .env.${ENV_FILE} | xargs)
elif [ -f ".env" ] && [ "$ENV_FILE" = "env" ]; then
    echo "Loading environment from .env"
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: Environment file .env.${ENV_FILE} not found"
    echo "Available .env files:"
    ls -la .env* 2>/dev/null || echo "No .env files found"
    exit 1
fi

# Ensure required environment variables are set
if [ -z "$EAS_PROJECT_ID" ]; then
    echo "Error: EAS_PROJECT_ID is not set in ${ENV_FILE}"
    exit 1
fi

# Display detected environment
echo "Using APP_VARIANT=${APP_VARIANT} with EAS_PROJECT_ID=${EAS_PROJECT_ID}"

# Determine app name based on APP_VARIANT
if [[ "$APP_VARIANT" == "production" ]]; then
    APP_NAME="AudioPlayground"
else
    APP_NAME="AudioDevPlayground"
fi

# Function to check if a file exists
file_exists() {
    if [[ (! -f "$1" && ! -d "$1") || $FORCE_BUILD -eq 1 ]]; then
        return 1
    else
        return 0
    fi
}

# Function to check if screenshots for current version already exist
screenshots_exist() {
    local dir="$1"
    # Check if directory exists and contains at least one screenshot
    if [[ -d "$dir" && $(find "$dir" -name "*.png" | wc -l) -gt 0 && $FORCE_BUILD -eq 0 ]]; then
        return 0  # Screenshots exist
    else
        return 1  # Screenshots don't exist or force build is enabled
    fi
}

# Function for direct Android build with Gradle
build_android_direct() {
    echo "$(date): Directly building Android app using Gradle (APK only)..."
    cd android 
    if [[ "$APP_VARIANT" == "production" ]]; then
        # Build both the release APK and the androidTest APK
        NODE_ENV=production APP_VARIANT=production ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release
    elif [[ "$APP_VARIANT" == "preview" ]]; then
        APP_VARIANT=preview ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release
    elif [[ "$APP_VARIANT" == "development" ]]; then
        APP_VARIANT=development ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release
    else
        echo "Error: Unknown APP_VARIANT: $APP_VARIANT"
        exit 1
    fi
    build_status=$?
    cd ..
    
    # If build was successful, rename the APK to include the version number
    if [[ $build_status -eq 0 ]]; then
        STANDARD_APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
        VERSIONED_APK_PATH="android/app/build/outputs/apk/release/app-${APP_VERSION}-release.apk"
        VERSIONED_APK_ROOT="${APP_NAME}-${APP_VERSION}-${APP_VARIANT}.apk"
        
        if [[ -f "$STANDARD_APK_PATH" ]]; then
            echo "Renaming APK to include version: $VERSIONED_APK_PATH"
            cp "$STANDARD_APK_PATH" "$VERSIONED_APK_PATH"
            
            # Also copy to the project root for easy access
            echo "Creating versioned copy in project root: $VERSIONED_APK_ROOT"
            cp "$STANDARD_APK_PATH" "./$VERSIONED_APK_ROOT"
            
            echo "Versioned APK created successfully"
        else
            echo "Warning: APK not found at expected path: $STANDARD_APK_PATH"
        fi
    fi
    
    return $build_status
}

generate_ios_screenshots() {
    echo "$(date): Generating iOS screenshots using app: $APP_NAME (variant: $APP_VARIANT)"

    # Check if screenshots for the current version already exist
    if screenshots_exist "$IOS_SCREENSHOTS_DIR"; then
        echo "$(date): iOS screenshots for version $APP_VERSION already exist. Skipping..."
        echo "Use the 'force' option to regenerate screenshots."
        return
    fi

    # Check if the correct prebuild exists for the current APP_VARIANT
    if [ ! -d "./ios/$APP_NAME.xcworkspace" ]; then
        echo "ERROR: Could not find iOS workspace for $APP_NAME (variant: $APP_VARIANT)"
        echo "The required workspace '$APP_NAME.xcworkspace' does not exist."
        echo ""
        echo "You need to run prebuild with the correct APP_VARIANT first:"
        echo "  APP_VARIANT=$APP_VARIANT yarn expo prebuild --clean"
        echo ""
        echo "Available workspaces:"
        find ./ios -name "*.xcworkspace" -maxdepth 1 | sed 's|./ios/||'
        exit 1
    fi

    if file_exists "./ios/build/Build/Products/Release-iphonesimulator/$APP_NAME.app"; then
        echo "$(date): iOS build exists. Skipping..."
    else
        echo "build not found --- creating new one"
        # Use direct Xcode build command and ensure we return to original directory after build
        pushd ios > /dev/null
        xcodebuild -workspace "$APP_NAME.xcworkspace" -scheme "$APP_NAME" -configuration Release -sdk iphonesimulator -derivedDataPath build
        popd > /dev/null
    fi

    # Create version-specific directory for screenshots
    mkdir -p "$IOS_SCREENSHOTS_DIR"
    
    # Create symlink to latest version
    rm -f "./fastlane/detox/ios/latest"
    ln -sf "v${APP_VERSION}" "./fastlane/detox/ios/latest"

    # Temporarily set DETOX_ARTIFACTS_LOCATION to version-specific directory
    export DETOX_ARTIFACTS_LOCATION="$IOS_SCREENSHOTS_DIR"
    
    # Generate screenshots only for largest device sizes (Apple will auto-adapt for smaller devices)
    echo "$(date): Generating iPhone screenshots (iPhone 16 Pro Max - 6.9\" display)"
    APP_VARIANT=$APP_VARIANT yarn detox test -c ios.sim.release e2e/screenshots.test.ts
    
    echo "$(date): Generating iPad screenshots (iPad Pro 13-inch M4)"
    APP_VARIANT=$APP_VARIANT yarn detox test -c ios.iPadPro.release e2e/screenshots.test.ts

    echo "$(date): Framing iOS screenshots..."
    # fastlane ios frame # disabled for now since it changes the format of the image
    
    # Create version info file
    echo "App: $APP_NAME ($APP_VARIANT)" > "$IOS_SCREENSHOTS_DIR/version_info.txt"
    echo "Version: $APP_VERSION" >> "$IOS_SCREENSHOTS_DIR/version_info.txt"
    echo "Generated: $(date)" >> "$IOS_SCREENSHOTS_DIR/version_info.txt"
}

generate_android_screenshots() {
    echo "$(date): Generating Android screenshots using app: $APP_NAME (variant: $APP_VARIANT)"

    # Check if screenshots for the current version already exist
    if screenshots_exist "$ANDROID_SCREENSHOTS_DIR"; then
        echo "$(date): Android screenshots for version $APP_VERSION already exist. Skipping..."
        echo "Use the 'force' option to regenerate screenshots."
        return
    fi

    # Enhanced check for existing build artifacts to avoid duplication - focus only on APK
    # Gradle produces APKs with these names regardless of APP_NAME value
    STANDARD_APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    VERSIONED_APK_PATH="android/app/build/outputs/apk/release/app-${APP_VERSION}-release.apk"
    TEST_APK_PATH="android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk"
    VERSIONED_APK_ROOT="${APP_NAME}-${APP_VERSION}-${APP_VARIANT}.apk"
    
    # Find any existing APK files in the project root
    FOUND_BUILDS=$(find . -maxdepth 1 -name "*.apk" 2>/dev/null)
    FOUND_VERSIONED_BUILDS=$(find . -maxdepth 1 -name "${APP_NAME}-${APP_VERSION}-*.apk" 2>/dev/null)
    
    # Check if required APKs exist
    if [[ -f "$STANDARD_APK_PATH" && -f "$TEST_APK_PATH" && $FORCE_BUILD -eq 0 ]]; then
        echo "$(date): Android APK builds exist (main and test). Skipping build..."
        BUILD_EXISTS=1
    elif [[ -f "$VERSIONED_APK_PATH" && -f "$TEST_APK_PATH" && $FORCE_BUILD -eq 0 ]]; then
        echo "$(date): Versioned Android APK builds exist. Skipping build..."
        # Make sure the standard path has the APK too, for Detox
        if [[ ! -f "$STANDARD_APK_PATH" ]]; then
            echo "Copying versioned APK to standard location for testing"
            cp "$VERSIONED_APK_PATH" "$STANDARD_APK_PATH"
        fi
        BUILD_EXISTS=1
    elif [[ -n "$FOUND_VERSIONED_BUILDS" && $FORCE_BUILD -eq 0 ]]; then
        echo "$(date): Versioned Android APK found in project root:"
        echo "$FOUND_VERSIONED_BUILDS"
        echo "But test APK is missing. Running build to generate test APK..."
        BUILD_EXISTS=0
    elif [[ -n "$FOUND_BUILDS" && $FORCE_BUILD -eq 0 ]]; then
        echo "$(date): Android APK found in project root:"
        echo "$FOUND_BUILDS"
        echo "But test APK is missing. Running build to generate test APK..."
        BUILD_EXISTS=0
    else
        echo "$(date): No existing Android APK found or force build enabled (FORCE_BUILD=$FORCE_BUILD)"
        BUILD_EXISTS=0
    fi
    
    # Only build if no existing build was found or force flag is set
    if [[ $BUILD_EXISTS -eq 0 ]]; then
        echo "build not found --- creating new one"
        # Build directly with Gradle (APK only)
        echo "Building Android app with Gradle (APK only)..."
        build_android_direct
        build_status=$?
        
        # Check if build succeeded
        if [[ $build_status -ne 0 ]]; then
            echo "Error: Failed to build Android app"
            exit 1
        fi
        
        # Check if test APK was generated
        if [[ ! -f "$TEST_APK_PATH" ]]; then
            echo "Error: Test APK not generated at: $TEST_APK_PATH"
            exit 1
        fi
    fi

    # Create version-specific directory for screenshots
    mkdir -p "$ANDROID_SCREENSHOTS_DIR"
    
    # Create symlink to latest version
    rm -f "./fastlane/detox/android/latest"
    ln -sf "v${APP_VERSION}" "./fastlane/detox/android/latest"
    
    # Temporarily set DETOX_ARTIFACTS_LOCATION to version-specific directory
    export DETOX_ARTIFACTS_LOCATION="$ANDROID_SCREENSHOTS_DIR"

    # Export app name so Detox can find the correct APK
    export APP_NAME="app"  # Gradle always uses this name for the APK
    APP_VARIANT=$APP_VARIANT yarn detox test -c android.emu.release e2e/screenshots.test.ts
    
    # Create version info file
    echo "App: $APP_NAME ($APP_VARIANT)" > "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    echo "Version: $APP_VERSION" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    echo "Generated: $(date)" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    
    # If we created a versioned APK, note it in the version_info file
    if [[ -f "$VERSIONED_APK_ROOT" ]]; then
        echo "APK: $VERSIONED_APK_ROOT" >> "$ANDROID_SCREENSHOTS_DIR/version_info.txt"
    fi
}

organize_screenshots() {
    local version_dir="$1"
    local platform="$2"  # "ios" or "android"
    local output_dir="${version_dir}/final"
    local version=$(basename "$version_dir" | sed 's/^v//')
    
    echo "$(date): Organizing $platform screenshots for $version_dir..."
    
    # Create output directory
    mkdir -p "$output_dir"
    
    # Process each run directory separately to properly handle multiple devices
    if [[ "$platform" == "ios" ]]; then
        # For iOS, handle both iPhone and iPad
        local iphone_dir=$(find "$version_dir" -maxdepth 1 -type d -name "ios.sim.release.*" | sort | tail -n 1)
        local ipad_dir=$(find "$version_dir" -maxdepth 1 -type d -name "ios.iPadPro.release.*" | sort | tail -n 1)
        
        if [ -n "$iphone_dir" ]; then
            process_device_screenshots "$iphone_dir" "$output_dir" "iphone" "$platform" "$version"
        else
            echo "Warning: No iPhone screenshots found"
        fi
        
        if [ -n "$ipad_dir" ]; then
            process_device_screenshots "$ipad_dir" "$output_dir" "ipad-pro" "$platform" "$version"
        else
            echo "Warning: No iPad screenshots found"
        fi
    else
        # For Android, handle Android phones
        local android_dir=$(find "$version_dir" -maxdepth 1 -type d -name "android.emu.release.*" | sort | tail -n 1)
        
        if [ -n "$android_dir" ]; then
            process_device_screenshots "$android_dir" "$output_dir" "android-phone" "$platform" "$version"
        else
            echo "Warning: No Android screenshots found"
        fi
    fi
    
    # Update version info with timestamp and device summary
    echo "App Version: $APP_VERSION ($APP_VARIANT)" > "$output_dir/version_info.txt"
    echo "Screenshots last updated: $(date)" >> "$output_dir/version_info.txt"
    echo "Devices:" >> "$output_dir/version_info.txt"
    
    # List all device types with screenshot counts
    find "$output_dir" -mindepth 1 -maxdepth 1 -type d | while read -r dev_dir; do
        local dev=$(basename "$dev_dir")
        local count=$(find "$dev_dir" -name "*.png" | wc -l)
        echo "  - $dev: $count screenshots" >> "$output_dir/version_info.txt"
    done
    
    # Copy version info to the permanent directory
    mkdir -p "./screenshots/v${version}"
    cp "$output_dir/version_info.txt" "./screenshots/v${version}/" 2>/dev/null
    
    # Count final screenshots by device
    local total=$(find "./screenshots/v${version}" -name "*.png" | wc -l | tr -d ' ')
    echo "$(date): Organized $total $platform screenshots to permanent location: ./screenshots/v${version}"
}

# Helper function to process screenshots for a specific device type
process_device_screenshots() {
    local device_dir="$1"
    local output_dir="$2"
    local device_type="$3"
    local platform="$4"
    local version="$5"
    
    echo "Processing screenshots for $device_type from $(basename "$device_dir")"
    
    # Create device directories
    mkdir -p "$output_dir/$device_type"
    mkdir -p "./screenshots/v${version}/$platform/$device_type"
    
    # Clean out existing screenshots to ensure we don't keep bad files
    rm -f "$output_dir/$device_type"/*.png
    
    # Create a mapping file for easier debugging
    mapping_file="$output_dir/screenshot-mapping-${device_type}.txt"
    echo "Screenshot File Mapping ($(date)):" > "$mapping_file"
    echo "Platform: $platform, Device: $device_type" >> "$mapping_file"
    echo "-------------------------------------------" >> "$mapping_file"
    
    # Process screenshots for the device
    if [ -d "$device_dir" ]; then
        # First, handle basic/advanced mode screenshots
        find "$device_dir" -path "*Record screen in basic and advanced modes*record-tab-basic-mode.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/01-record-basic-mode.png"
            echo "Saved: 01-record-basic-mode.png (from $file)"
            echo "01-record-basic-mode.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Record screen in basic and advanced modes*record-tab-advanced-mode.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/02-record-advanced-mode.png"
            echo "Saved: 02-record-advanced-mode.png (from $file)"
            echo "02-record-advanced-mode.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Record screen in basic and advanced modes*record-tab-advanced-visible-portion.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/02a-record-advanced-visible.png"
            echo "Saved: 02a-record-advanced-visible.png (from $file)"
            echo "02a-record-advanced-visible.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        # Then handle tab screenshots
        find "$device_dir" -path "*Tab Screenshots should capture Record tab*record-tab.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/03-record-tab.png"
            echo "Saved: 03-record-tab.png (from $file)"
            echo "03-record-tab.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Tab Screenshots should capture Import tab*import-tab.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/04-import-tab.png"
            echo "Saved: 04-import-tab.png (from $file)"
            echo "04-import-tab.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Tab Screenshots should capture Transcription tab*transcription-tab.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/05-transcription-tab.png"
            echo "Saved: 05-transcription-tab.png (from $file)"
            echo "05-transcription-tab.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Tab Screenshots should capture Files tab*files-tab.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/06-files-tab.png"
            echo "Saved: 06-files-tab.png (from $file)"
            echo "06-files-tab.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        find "$device_dir" -path "*Tab Screenshots should capture More tab*more-tab.png" -type f | while read -r file; do
            cp "$file" "$output_dir/$device_type/07-more-tab.png"
            echo "Saved: 07-more-tab.png (from $file)"
            echo "07-more-tab.png <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        # Look for any other screenshots to include
        find "$device_dir" -name "*.png" | grep -v -E "record-tab-basic-mode.png|record-tab-advanced-mode.png|record-tab-advanced-visible-portion.png|record-tab.png|import-tab.png|transcription-tab.png|files-tab.png|more-tab.png" | while read -r file; do
            local filename=$(basename "$file")
            local safe_name="other-${filename//[^a-zA-Z0-9._-]/_}"
            cp "$file" "$output_dir/$device_type/$safe_name"
            echo "Saved: $safe_name (from $file)"
            echo "$safe_name <- $(basename "$(dirname "$file")")/$(basename "$file")" >> "$mapping_file"
        done
        
        # Copy all screenshots to the permanent directory
        cp -f "$output_dir/$device_type"/*.png "./screenshots/v${version}/$platform/$device_type/" 2>/dev/null
        cp "$mapping_file" "./screenshots/v${version}/$platform/" 2>/dev/null
    fi
}

remove_alpha_channel() {
    local version_dir="$1"
    local platform="$2"  # "ios" or "android"
    echo "$(date): Removing alpha channel from $platform screenshots..."
    
    # Ensure the directory exists
    local final_dir="${version_dir}/final"
    if [ ! -d "$final_dir" ]; then
        echo "Warning: Directory $final_dir does not exist, skipping alpha channel removal."
        return
    fi
    
    # Find all PNG files in the final directory
    local screenshots=$(find "$final_dir" -name "*.png" 2>/dev/null)
    
    # Check if any PNG files were found
    if [ -z "$screenshots" ]; then
        echo "Warning: No PNG files found in $final_dir, skipping alpha channel removal."
        return
    fi
    
    echo "Found $(echo "$screenshots" | wc -l | tr -d ' ') screenshots to process"
    
    # Process each screenshot
    echo "$screenshots" | while read -r screenshot; do
        if [ "$IMAGEMAGICK_CMD" = "magick" ]; then
            magick "$screenshot" -alpha off "$screenshot" || {
                echo "Error: Failed to process $screenshot. Make sure ImageMagick is properly installed."
                exit 1
            }
        else
            convert "$screenshot" -alpha off "$screenshot" || {
                echo "Error: Failed to process $screenshot. Make sure ImageMagick is properly installed."
                exit 1
            }
        fi
    done
    
    # Also remove alpha from the screenshots in the permanent directory
    local version=$(basename "$version_dir" | sed 's/^v//')
    local perm_dir="./screenshots/v${version}/$platform"
    
    if [ -d "$perm_dir" ]; then
        echo "Processing permanent screenshots directory: $perm_dir"
        
        # Use find with a specific depth to only get PNG files directly in device subdirectories
        find "$perm_dir" -path "*/$platform/*/*.png" -type f | while read -r screenshot; do
            echo "Processing: $screenshot"
            if [ "$IMAGEMAGICK_CMD" = "magick" ]; then
                magick "$screenshot" -alpha off "$screenshot" || {
                    echo "Warning: Failed to process $screenshot in permanent directory."
                }
            else
                convert "$screenshot" -alpha off "$screenshot" || {
                    echo "Warning: Failed to process $screenshot in permanent directory."
                }
            fi
        done
    fi
    
    echo "$(date): Alpha channel removed successfully from screenshots!"
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

# Display summary of available screenshot versions
echo "$(date): Screenshot generation completed!"
echo "Available iOS screenshot versions:"
find ./fastlane/detox/ios -maxdepth 1 -name "v*" -type d | sort -V | while read -r dir; do
    version=$(basename "$dir")
    count=$(find "$dir" -name "*.png" | wc -l)
    echo "  - $version ($count screenshots)"
done

echo "Available Android screenshot versions:"
find ./fastlane/detox/android -maxdepth 1 -name "v*" -type d | sort -V | while read -r dir; do
    version=$(basename "$dir")
    count=$(find "$dir" -name "*.png" | wc -l)
    echo "  - $version ($count screenshots)"
done

# Display organized screenshots summary
echo ""
echo "Final organized screenshots by version:"
find ./screenshots -maxdepth 1 -name "v*" -type d | sort -V | while read -r dir; do
    version=$(basename "$dir")
    ios_count=$(find "$dir/ios" -name "*.png" 2>/dev/null | wc -l)
    android_count=$(find "$dir/android" -name "*.png" 2>/dev/null | wc -l)
    echo "  - $version (iOS: $ios_count, Android: $android_count screenshots)"
    
    # Show device breakdown
    find "$dir" -mindepth 2 -maxdepth 2 -type d | while read -r device_dir; do
        rel_path="${device_dir#$dir/}"
        count=$(find "$device_dir" -name "*.png" | wc -l)
        echo "    - $rel_path: $count screenshots"
    done
done
echo "View these screenshots in the 'screenshots/' directory for app store submissions."

echo "$(date): Script completed successfully!"