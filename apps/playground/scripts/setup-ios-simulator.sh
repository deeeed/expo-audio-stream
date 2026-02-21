#!/bin/bash

# iOS Simulator Setup Script for Agent Validation
# Automatically boots the best available iPhone simulator

set -e

echo "🍎 iOS SIMULATOR SETUP FOR AGENT VALIDATION"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "iOS simulator setup requires macOS - current OS: $OSTYPE"
    exit 1
fi

# Check if a simulator is already running
if xcrun simctl list devices | grep -q "iPhone.*Booted"; then
    RUNNING_SIM=$(xcrun simctl list devices | grep "iPhone.*Booted" | head -1 | sed 's/^[[:space:]]*//' | cut -d'(' -f1 | sed 's/[[:space:]]*$//')
    print_success "iPhone simulator already running: $RUNNING_SIM"
    print_status "You can now run: scripts/agentic/app-state.sh state"
    exit 0
fi

print_status "Looking for available iPhone simulators..."

# Agentic framework standard simulators (matching .detoxrc.js configuration)
PREFERRED_SIMS=("iPhone 16 Pro Max" "iPhone 15 Pro Max" "iPhone 15 Pro" "iPhone 16 Pro" "iPhone 15")

# Find the best available simulator
CHOSEN_SIM=""
for sim in "${PREFERRED_SIMS[@]}"; do
    if xcrun simctl list devices | grep -q "$sim.*Shutdown"; then
        CHOSEN_SIM="$sim"
        break
    fi
done

# If no preferred simulator found, use any available iPhone
if [ -z "$CHOSEN_SIM" ]; then
    AVAILABLE_SIM=$(xcrun simctl list devices | grep "iPhone.*Shutdown" | head -1 | sed 's/^[[:space:]]*//' | cut -d'(' -f1 | sed 's/[[:space:]]*$//')
    if [ -n "$AVAILABLE_SIM" ]; then
        CHOSEN_SIM="$AVAILABLE_SIM"
    fi
fi

if [ -z "$CHOSEN_SIM" ]; then
    print_error "No iPhone simulators available!"
    print_status "Available devices:"
    xcrun simctl list devices | grep iPhone
    print_status "Please install iOS simulators through Xcode"
    exit 1
fi

print_status "Booting iOS simulator: $CHOSEN_SIM"

# Boot the chosen simulator
if xcrun simctl boot "$CHOSEN_SIM"; then
    print_success "Successfully booted: $CHOSEN_SIM"
    
    # Wait a moment for simulator to fully boot
    print_status "Waiting for simulator to fully boot..."
    sleep 3
    
    # Open Simulator app
    print_status "Opening Simulator app..."
    open -a Simulator
    
    # Verify simulator is running
    if xcrun simctl list devices | grep -q "$CHOSEN_SIM.*Booted"; then
        print_success "iOS simulator is ready for agent validation!"
        echo ""
        print_status "You can now run:"
        echo "  scripts/agentic/app-state.sh state"
        echo "  scripts/agentic/app-navigate.sh \"/(tabs)/record\""
        echo "  yarn e2e:ios:storybook"
        echo "  yarn e2e:ios:agent-validation"
    else
        print_warning "Simulator may still be booting. Please wait a moment and try again."
    fi
else
    print_error "Failed to boot simulator: $CHOSEN_SIM"
    print_status "Try manually:"
    echo "  xcrun simctl boot \"$CHOSEN_SIM\""
    exit 1
fi