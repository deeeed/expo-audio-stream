#!/bin/bash

# ========================================================
# iOS Simulator Setup Script (Cross-Platform)
# ========================================================
# This script sets up iOS simulators for screenshot generation
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
    simulator_names=("iPhone 15" "iPhone 15 Pro Max" "iPad Pro (12.9-inch) (6th generation)")
    simulator_types=(
        "com.apple.CoreSimulator.SimDeviceType.iPhone-15" 
        "com.apple.CoreSimulator.SimDeviceType.iPhone-15-Pro-Max" 
        "com.apple.CoreSimulator.SimDeviceType.iPad-Pro-12-9-inch-6th-generation"
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
