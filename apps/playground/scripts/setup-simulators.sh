#!/bin/bash

# ========================================================
# iOS and Android Simulator Setup Script (Cross-Platform)
# ========================================================
# This script sets up iOS simulators and Android emulators for screenshot generation
# It works on both macOS (for real simulators) and Linux (for CI)
# ========================================================

# Text formatting for better readability
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print a section header
print_header() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..50})${NC}\n"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print info message
print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
print_header "Platform Detection"
print_info "Detected operating system: $OS"

# ========================================================
# macOS-specific simulator setup
# ========================================================
setup_macos_simulators() {
    # Define the simulators we want to create - using arrays instead of associative arrays
    # for better compatibility with different bash versions
    simulator_names=("iPhone 16 Pro Max" "iPad Pro 13-inch (M4)")
    simulator_types=(
        "com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max" 
        "com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M4"
    )
    
    # Fallback device types in case the latest aren't available
    fallback_names=("iPhone 15 Pro Max" "iPad Air 13-inch (M3)")
    fallback_types=(
        "com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro-Max" 
        "com.apple.CoreSimulator.SimDeviceType.iPad-Air-13-inch-M3"
    )

    # ========================================================
    # Find the latest iOS runtime
    # ========================================================
    print_header "Checking Available iOS Runtimes"

    # Get all available iOS runtimes
    available_runtimes=$(xcrun simctl list runtimes | grep -i "iOS" | grep -v "unavailable")
    
    if [ -z "$available_runtimes" ]; then
        print_error "No iOS runtimes found. Please install iOS runtimes using Xcode."
        exit 1
    fi
    
    echo "$available_runtimes"

    # Extract the latest iOS runtime identifier
    latest_runtime=$(echo "$available_runtimes" | tail -1 | sed -E 's/.*- ([^ ]+)$/\1/')
    latest_version=$(echo "$available_runtimes" | tail -1 | sed -E 's/iOS ([0-9.]+).*/\1/')

    print_success "Using iOS $latest_version ($latest_runtime)"

    # ========================================================
    # Check for existing simulators
    # ========================================================
    print_header "Checking Existing Simulators"

    # Get list of current simulators
    current_simulators=$(xcrun simctl list devices | grep -v "unavailable")
    echo "$current_simulators"

    # ========================================================
    # Create simulators if they don't exist
    # ========================================================
    print_header "Setting Up Required Simulators"

    # Check if the simulator exists
    simulator_exists() {
        local name=$1
        echo "$current_simulators" | grep -q "$name"
        return $?
    }

    # Create the simulator
    create_simulator() {
        local name=$1
        local type=$2
        print_info "Creating simulator: $name"
        xcrun simctl create "$name" "$type" "$latest_runtime"
        if [ $? -eq 0 ]; then
            print_success "Created simulator: $name"
        else
            print_error "Failed to create simulator: $name"
            # Try to find if the device type exists
            print_info "Checking available device types..."
            xcrun simctl list devicetypes | grep -i "$name"
            return 1
        fi
        return 0
    }

    # Check available device types and adjust if needed
    print_header "Checking Available Device Types"
    available_device_types=$(xcrun simctl list devicetypes)
    echo "$available_device_types"
    
    # Function to check if device type exists
    device_type_exists() {
        local type=$1
        echo "$available_device_types" | grep -q "$type"
        return $?
    }
    
    # Use fallback types if primary ones aren't available
    for i in "${!simulator_types[@]}"; do
        if ! device_type_exists "${simulator_types[$i]}"; then
            print_info "Device type ${simulator_types[$i]} not available, using fallback ${fallback_types[$i]}"
            simulator_types[$i]="${fallback_types[$i]}"
            simulator_names[$i]="${fallback_names[$i]}"
        fi
    done

    # Process each simulator
    for i in "${!simulator_names[@]}"; do
        name="${simulator_names[$i]}"
        type="${simulator_types[$i]}"
        if simulator_exists "$name"; then
            print_success "Simulator already exists: $name"
        else
            create_simulator "$name" "$type"
            # Update the current_simulators variable after creating a new simulator
            current_simulators=$(xcrun simctl list devices | grep -v "unavailable")
        fi
    done

    # ========================================================
    # Summary
    # ========================================================
    print_header "Simulator Setup Complete"
    print_info "The following simulators are ready for screenshot generation:"

    for name in "${simulator_names[@]}"; do
        if simulator_exists "$name"; then
            print_success "$name (iOS $latest_version)"
        else
            print_error "$name (Failed to create)"
        fi
    done
}

# ========================================================
# Android emulator setup for macOS
# ========================================================
setup_android_emulators() {
    print_header "Setting Up Android Emulators"
    
    # Check if Android SDK is available
    if [[ -z "$ANDROID_HOME" && -z "$ANDROID_SDK_ROOT" ]]; then
        print_error "Android SDK not found. Please set ANDROID_HOME or ANDROID_SDK_ROOT environment variable."
        return 1
    fi
    
    # Use ANDROID_HOME if available, otherwise try ANDROID_SDK_ROOT
    ANDROID_SDK=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
    print_info "Using Android SDK at: $ANDROID_SDK"
    
    # Path to AVD manager
    AVD_MANAGER="$ANDROID_SDK/cmdline-tools/latest/bin/avdmanager"
    if [[ ! -f "$AVD_MANAGER" ]]; then
        AVD_MANAGER="$ANDROID_SDK/tools/bin/avdmanager"
    fi
    
    if [[ ! -f "$AVD_MANAGER" ]]; then
        print_error "AVD Manager not found at $AVD_MANAGER"
        print_info "Please make sure Android command-line tools are installed."
        return 1
    fi
    
    # Path to emulator
    EMULATOR="$ANDROID_SDK/emulator/emulator"
    if [[ ! -f "$EMULATOR" ]]; then
        print_error "Android Emulator not found at $EMULATOR"
        print_info "Please make sure Android Emulator package is installed."
        return 1
    fi
    
    # Check existing AVDs
    print_header "Checking Existing Android Emulators"
    EXISTING_AVDS=$("$EMULATOR" -list-avds)
    echo "$EXISTING_AVDS"
    
    # Define the emulator we want to use
    # This must match the name in .detoxrc.js
    EMULATOR_NAME="medium"
    
    # Check if our emulator already exists
    if echo "$EXISTING_AVDS" | grep -q "$EMULATOR_NAME"; then
        print_success "Android emulator '$EMULATOR_NAME' already exists"
    else
        print_info "Creating Android emulator '$EMULATOR_NAME'..."
        
        # Find the latest system image (prefer x86_64 for better performance)
        SYSTEM_IMAGES=$("$AVD_MANAGER" list | grep -E "system-images.*android")
        SYSTEM_IMAGE=""
        
        # First try for x86_64 Google APIs
        if echo "$SYSTEM_IMAGES" | grep -q "system-images;android-33;google_apis;x86_64"; then
            SYSTEM_IMAGE="system-images;android-33;google_apis;x86_64"
        # Then try for x86 Google APIs
        elif echo "$SYSTEM_IMAGES" | grep -q "system-images;android-33;google_apis;x86"; then
            SYSTEM_IMAGE="system-images;android-33;google_apis;x86"
        # Then try for any recent API level
        elif echo "$SYSTEM_IMAGES" | grep -q "system-images;android-[0-9]*;google_apis;x86_64"; then
            SYSTEM_IMAGE=$(echo "$SYSTEM_IMAGES" | grep -o "system-images;android-[0-9]*;google_apis;x86_64" | sort -r | head -1)
        # Finally, try for any available image
        elif echo "$SYSTEM_IMAGES" | grep -q "system-images;android-[0-9]*;[^;]*;x86_64"; then
            SYSTEM_IMAGE=$(echo "$SYSTEM_IMAGES" | grep -o "system-images;android-[0-9]*;[^;]*;x86_64" | sort -r | head -1)
        elif echo "$SYSTEM_IMAGES" | grep -q "system-images;android-[0-9]*;[^;]*;x86"; then
            SYSTEM_IMAGE=$(echo "$SYSTEM_IMAGES" | grep -o "system-images;android-[0-9]*;[^;]*;x86" | sort -r | head -1)
        fi
        
        if [[ -z "$SYSTEM_IMAGE" ]]; then
            print_error "No suitable Android system image found."
            print_info "Please install a system image using Android Studio's SDK Manager."
            return 1
        fi
        
        print_info "Using system image: $SYSTEM_IMAGE"
        
        # Create the AVD
        "$AVD_MANAGER" create avd \
            --name "$EMULATOR_NAME" \
            --package "$SYSTEM_IMAGE" \
            --device "pixel_6" \
            --force
            
        if [ $? -eq 0 ]; then
            print_success "Created Android emulator: $EMULATOR_NAME"
            
            # Update config to make the emulator faster
            CONFIG_FILE="$HOME/.android/avd/${EMULATOR_NAME}.avd/config.ini"
            if [ -f "$CONFIG_FILE" ]; then
                print_info "Optimizing emulator performance..."
                echo "hw.ramSize=2048" >> "$CONFIG_FILE"
                echo "disk.dataPartition.size=6000M" >> "$CONFIG_FILE"
                echo "hw.gpu.enabled=yes" >> "$CONFIG_FILE"
                echo "hw.gpu.mode=host" >> "$CONFIG_FILE"
                echo "hw.keyboard=yes" >> "$CONFIG_FILE"
            fi
        else
            print_error "Failed to create Android emulator: $EMULATOR_NAME"
        fi
    fi
    
    print_success "Android emulator setup complete!"
}

# ========================================================
# Linux/CI environment setup (mock simulators)
# ========================================================
setup_linux_simulators() {
    print_header "CI Environment Setup (Linux)"
    print_info "On Linux, we don't create actual simulators but ensure Detox is properly configured."
    
    # Check if Detox is installed
    if ! command -v detox &> /dev/null; then
        print_error "Detox is not installed. Please install it with: npm install -g detox-cli"
        exit 1
    fi
    
    print_success "Detox is installed."
    print_info "In CI environments, simulators are typically mocked or tests run on real devices."
    print_info "Make sure your CI configuration has the appropriate test runners set up."
    
    # Check for .detoxrc.js file
    if [ -f ".detoxrc.js" ]; then
        print_success "Found .detoxrc.js configuration file."
    else
        print_error "No .detoxrc.js file found. Please ensure your Detox configuration is set up correctly."
    fi
    
    print_info "For CI environments, consider using Detox's 'none' driver or a cloud testing service."
}

# ========================================================
# Main execution
# ========================================================
case $OS in
    "macos")
        setup_macos_simulators
        setup_android_emulators
        ;;
    "linux")
        setup_linux_simulators
        ;;
    *)
        print_error "Unsupported operating system: $OS"
        print_info "This script is designed to run on macOS or Linux."
        exit 1
        ;;
esac

print_info "You can now run the screenshot generation script."
