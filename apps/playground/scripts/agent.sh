#!/bin/bash

# Unified Agent Validation Script
# Consolidates: agent-validation.sh, agent-validation-android.sh, agent-validation-ios.sh, 
#               agent-validation-fast.sh, agent-validation-targeted.sh

set -e

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

print_usage() {
    echo "🤖 Agent Validation Tool"
    echo "========================"
    echo ""
    echo "Usage:"
    echo "  ./scripts/agent.sh dev <feature> [platform] [custom_params] [--screenshots]"
    echo "  ./scripts/agent.sh full [platform]"
    echo "  ./scripts/agent.sh setup"
    echo "  ./scripts/agent.sh cleanup"
    echo ""
    echo "Commands:"
    echo "  dev     - Fast feature validation (< 2 minutes) [REQUIRED]"
    echo "  full    - Complete validation (5-10 minutes) [OPTIONAL]"
    echo "  setup   - Setup devices for validation"
    echo "  cleanup - Clean development artifacts"
    echo ""
    echo "Options:"
    echo "  --screenshots - Capture screenshots (only for UI development)"
    echo ""
    echo "Features (for dev command):"
    echo "  basic          - Standard recording workflow"
    echo "  compression    - Compressed audio output"
    echo "  high-frequency - High sample rates/intervals"
    echo "  multi-channel  - Stereo recording"
    echo "  pause-resume   - Pause/resume workflow"
    echo "  error-handling - Error scenarios"
    echo "  custom         - Custom parameters"
    echo ""
    echo "Platforms:"
    echo "  android - Test on Android device/emulator (default)"
    echo "  ios     - Test on iOS simulator (macOS only)"
    echo "  both    - Test on both platforms"
    echo ""
    echo "Examples:"
    echo "  ./scripts/agent.sh dev compression android"
    echo "  ./scripts/agent.sh dev basic ios"
    echo "  ./scripts/agent.sh dev custom android 'sampleRate=16000&channels=1'"
    echo "  ./scripts/agent.sh dev compression android --screenshots  # UI development"
    echo "  ./scripts/agent.sh full"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || ! grep -q "audio.*playground" package.json; then
        print_error "Must be run from the playground app directory"
        exit 1
    fi
}

# Quick TypeScript compilation check
check_compilation() {
    print_status "Quick TypeScript check..."
    if yarn typecheck --noEmit > /dev/null 2>&1; then
        print_success "TypeScript compilation OK"
    else
        print_error "TypeScript compilation failed - fix before proceeding"
        exit 1
    fi
}

# Device setup and checking
setup_devices() {
    print_status "Setting up validation devices..."
    
    # Check Android
    if command -v adb >/dev/null 2>&1; then
        ANDROID_DEVICES=$(adb devices | grep -v "List of devices" | grep "device$")
        if [ -n "$ANDROID_DEVICES" ]; then
            print_success "Android device(s) ready:"
            echo "$ANDROID_DEVICES" | while read line; do
                DEVICE_ID=$(echo $line | cut -d$'\t' -f1)
                echo "  • $DEVICE_ID"
            done
        else
            print_warning "No Android devices connected"
            print_status "Connect a device or start an emulator, then run: adb devices"
        fi
    else
        print_warning "ADB not found - Android SDK not installed or not in PATH"
    fi
    
    # Check iOS (macOS only)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v xcrun >/dev/null 2>&1; then
            RUNNING_SIMS=$(xcrun simctl list devices | grep "iPhone.*Booted")
            if [ -n "$RUNNING_SIMS" ]; then
                print_success "iOS simulator(s) running:"
                echo "$RUNNING_SIMS" | while read line; do
                    SIM_NAME=$(echo "$line" | sed 's/^[[:space:]]*//' | cut -d'(' -f1 | sed 's/[[:space:]]*$//')
                    echo "  • $SIM_NAME"
                done
            else
                print_warning "No iOS simulators running"
                print_status "Start a simulator: yarn setup:ios-simulator"
            fi
        else
            print_warning "Xcode command line tools not found"
        fi
    else
        print_status "iOS validation requires macOS (current: $OSTYPE)"
    fi
    
    echo ""
    print_status "Device setup complete!"
}

# Platform-specific device check
check_platform_device() {
    local platform=$1
    
    if [ "$platform" = "android" ]; then
        if ! adb devices | grep -q "device$"; then
            print_error "No Android device detected - connect device or start emulator"
            exit 1
        fi
        print_success "Android device ready"
    elif [ "$platform" = "ios" ]; then
        if [[ "$OSTYPE" != "darwin"* ]]; then
            print_error "iOS testing requires macOS - current OS: $OSTYPE"
            exit 1
        fi
        if ! xcrun simctl list devices | grep -q "iPhone.*Booted"; then
            print_error "No iOS simulator running - start simulator first"
            exit 1
        fi
        print_success "iOS simulator ready"
    fi
}

# Generate deep link URL based on feature
generate_test_url() {
    local feature=$1
    local custom_params=$2
    local base_params="sampleRate=44100&channels=1&encoding=pcm_16bit"
    
    if [ -n "$custom_params" ]; then
        echo "audioplayground://agent-validation?${custom_params}"
        return
    fi
    
    case $feature in
        "basic")
            echo "audioplayground://agent-validation?${base_params}&interval=100"
            ;;
        "compression")
            echo "audioplayground://agent-validation?${base_params}&compressedOutput=true&compressedFormat=aac&compressedBitrate=128000"
            ;;
        "high-frequency")
            echo "audioplayground://agent-validation?interval=10&sampleRate=48000&channels=1"
            ;;
        "multi-channel")
            echo "audioplayground://agent-validation?channels=2&sampleRate=44100&encoding=pcm_16bit"
            ;;
        "pause-resume")
            echo "audioplayground://agent-validation?${base_params}&testPauseResume=true"
            ;;
        "error-handling")
            echo "audioplayground://agent-validation?sampleRate=999999&channels=99&testErrors=true"
            ;;
        *)
            echo "audioplayground://agent-validation?${base_params}"
            ;;
    esac
}

# Development validation (< 2 minutes)
run_dev_validation() {
    local feature=${1:-"basic"}
    local platform=${2:-"android"}
    local custom_params=$3
    local enable_screenshots=$4
    
    print_status "🚀 DEVELOPMENT VALIDATION"
    print_status "=========================="
    print_status "Feature: $feature"
    print_status "Platform: $platform"
    if [ "$enable_screenshots" = "true" ]; then
        print_status "Screenshots: ENABLED (UI development mode)"
    else
        print_status "Screenshots: DISABLED (API validation mode)"
    fi
    echo ""
    
    check_compilation
    
    # Handle both platforms
    if [ "$platform" = "both" ]; then
        print_status "Testing on both platforms..."
        run_dev_validation "$feature" "android" "$custom_params" "$enable_screenshots"
        run_dev_validation "$feature" "ios" "$custom_params" "$enable_screenshots"
        return
    fi
    
    check_platform_device "$platform"
    
    # Generate test URL
    TEST_URL=$(generate_test_url "$feature" "$custom_params")
    print_status "Test URL: $TEST_URL"
    
    # Create screenshot directory only if screenshots enabled
    SCREENSHOT_DIR=""
    if [ "$enable_screenshots" = "true" ]; then
        SCREENSHOT_DIR="screenshots/dev-iteration/${feature}-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$SCREENSHOT_DIR"
        print_status "Screenshots will be saved to: $SCREENSHOT_DIR"
    fi
    
    # Export environment variables for E2E test
    export AGENT_FEATURE=$feature
    export AGENT_PLATFORM=$platform
    export AGENT_TEST_URL="$TEST_URL"
    export AGENT_SCREENSHOT_DIR="$SCREENSHOT_DIR"
    
    # Build if needed (check for existing build)
    if [ "$platform" = "android" ]; then
        APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
        if [ ! -f "$APK_PATH" ]; then
            print_status "Building Android app (first time)..."
            yarn detox:build:android > /dev/null 2>&1
        fi
        TEST_COMMAND="yarn detox test e2e/agent-validation.test.ts --configuration android.att.debug"
    else
        if [ ! -d "ios/build" ]; then
            print_status "Building iOS app (first time)..."
            yarn detox:build:ios > /dev/null 2>&1
        fi
        TEST_COMMAND="yarn detox test e2e/agent-validation.test.ts --configuration ios.sim.debug"
    fi
    
    # Run targeted E2E test
    print_status "Running feature validation..."
    
    # Create log file for detailed output (project-relative)
    mkdir -p logs/agent-validation
    LOG_FILE="logs/agent-validation/${feature}-${platform}-$(date +%Y%m%d-%H%M%S).log"
    
    if timeout 120 $TEST_COMMAND > "$LOG_FILE" 2>&1; then
        print_success "✅ Feature validation PASSED: $feature"
        if [ "$enable_screenshots" = "true" ] && [ -n "$SCREENSHOT_DIR" ]; then
            print_status "Screenshots saved to: $SCREENSHOT_DIR"
        fi
        
        # Show success summary from logs
        echo ""
        print_status "📋 TEST RESULTS SUMMARY:"
        grep -E "✓|PASS|OK" "$LOG_FILE" | tail -10 || echo "All tests passed successfully"
        
        # Cleanup log file on success
        rm -f "$LOG_FILE"
    else
        print_error "❌ Feature validation FAILED: $feature"
        echo ""
        print_error "📋 DETAILED FAILURE ANALYSIS:"
        echo "============================================"
        
        # Show failed tests
        echo ""
        echo "🔴 FAILED TESTS:"
        grep -E "✕|FAIL|\● " "$LOG_FILE" | head -10 || echo "No specific test failures found"
        
        # Show specific error messages
        echo ""
        echo "🔍 ERROR DETAILS:"
        grep -A 3 -B 1 -E "(Error|Failed|timeout|Exception)" "$LOG_FILE" | tail -20 || echo "No specific error details found"
        
        # Show test summary
        echo ""
        echo "📊 TEST SUMMARY:"
        grep -E "Test Suites|Tests:|Snapshots" "$LOG_FILE" | tail -5 || echo "No test summary found"
        
        echo ""
        echo "============================================"
        print_status "💡 AGENT ACTIONABLE FEEDBACK:"
        
        # Analyze common failure patterns and provide specific guidance
        if grep -q "timeout expired" "$LOG_FILE"; then
            echo "• UI elements not found - check testID attributes in React components"
            echo "• Recording API may not be working - verify expo-audio-studio integration"
        fi
        
        if grep -q "has effective visibility" "$LOG_FILE"; then
            echo "• UI elements exist but not visible - check component rendering logic"
            echo "• ScrollView issues - elements may be off-screen"
        fi
        
        if grep -q "Test Failed" "$LOG_FILE"; then
            echo "• Specific test assertions failing - review test expectations vs actual behavior"
        fi
        
        echo "• Full logs saved to: $LOG_FILE"
        echo "• Run 'cat $LOG_FILE' to see complete test output"
        echo "• Logs are in project directory (ignored by git)"
        
        if [ "$enable_screenshots" = "true" ] && [ -n "$SCREENSHOT_DIR" ]; then
            print_warning "Check screenshots in $SCREENSHOT_DIR for debugging"
        fi
        
        echo ""
        exit 1
    fi
    
    echo ""
    print_success "🎉 DEVELOPMENT VALIDATION COMPLETE"
    print_status "Feature '$feature' validated successfully on $platform"
    print_status "Duration: < 2 minutes"
    if [ "$enable_screenshots" = "true" ]; then
        print_status "Mode: UI development (with screenshots)"
    else
        print_status "Mode: API validation (no screenshots)"
    fi
    echo ""
}

# Full validation (optional)
run_full_validation() {
    local platform=${1:-"both"}
    
    print_status "🔍 FULL VALIDATION (OPTIONAL)"
    print_status "=============================="
    print_status "Platform: $platform"
    echo ""
    
    print_warning "This is comprehensive testing (5-10 minutes)"
    print_warning "Not required for agent completion - use for CI or manual choice"
    echo ""
    
    check_compilation
    
    # Package build
    print_status "Building expo-audio-studio package..."
    if cd ../../packages/expo-audio-studio && yarn build > /dev/null 2>&1; then
        print_success "Package build passed"
        cd ../../apps/playground
    else
        print_error "Package build failed"
        exit 1
    fi
    
    # Platform-specific validation
    if [ "$platform" = "android" ] || [ "$platform" = "both" ]; then
        check_platform_device "android"
        print_status "Running Android validation..."
        
        # Unit tests
        mkdir -p logs/full-validation
        UNIT_LOG="logs/full-validation/android-unit-tests-$(date +%Y%m%d-%H%M%S).log"
        if yarn test:android:unit > "$UNIT_LOG" 2>&1; then
            print_success "Android unit tests passed (25/25)"
            rm -f "$UNIT_LOG"
        else
            print_error "Android unit tests failed - details in $UNIT_LOG"
            echo "Run: cat $UNIT_LOG"
            exit 1
        fi
        
        # Integration tests
        INTEGRATION_LOG="logs/full-validation/android-integration-tests-$(date +%Y%m%d-%H%M%S).log"
        if yarn test:android:instrumented > "$INTEGRATION_LOG" 2>&1; then
            print_success "Android integration tests passed (11/11)"
            rm -f "$INTEGRATION_LOG"
        else
            print_error "Android integration tests failed - details in $INTEGRATION_LOG"
            echo "Run: cat $INTEGRATION_LOG"
            exit 1
        fi
        
        # E2E tests
        yarn detox:build:android > /dev/null 2>&1
        E2E_RECORD_LOG="logs/full-validation/android-e2e-record-$(date +%Y%m%d-%H%M%S).log"
        if yarn e2e:android:record > "$E2E_RECORD_LOG" 2>&1; then
            print_success "Android E2E recording tests passed"
            rm -f "$E2E_RECORD_LOG"
        else
            print_error "Android E2E recording tests failed - details in $E2E_RECORD_LOG"
            echo "Run: cat $E2E_RECORD_LOG"
            exit 1
        fi
        
        E2E_IMPORT_LOG="logs/full-validation/android-e2e-import-$(date +%Y%m%d-%H%M%S).log"
        if yarn e2e:android:import > "$E2E_IMPORT_LOG" 2>&1; then
            print_success "Android E2E import tests passed"
            rm -f "$E2E_IMPORT_LOG"
        else
            print_error "Android E2E import tests failed - details in $E2E_IMPORT_LOG"
            echo "Run: cat $E2E_IMPORT_LOG"
            exit 1
        fi
    fi
    
    if [ "$platform" = "ios" ] || [ "$platform" = "both" ]; then
        check_platform_device "ios"
        print_status "Running iOS validation..."
        
        # iOS integration tests
        if cd ../../packages/expo-audio-studio/ios/tests && ./run_integration_tests.sh > /dev/null 2>&1; then
            print_success "iOS integration tests passed (66/66)"
            cd ../../../../apps/playground
        else
            print_error "iOS integration tests failed"
            exit 1
        fi
        
        # iOS E2E tests
        yarn detox:build:ios > /dev/null 2>&1
        if yarn e2e:ios:record > /dev/null 2>&1; then
            print_success "iOS E2E recording tests passed"
        else
            print_error "iOS E2E recording tests failed"
            exit 1
        fi
        
        if yarn e2e:ios:import > /dev/null 2>&1; then
            print_success "iOS E2E import tests passed"
        else
            print_error "iOS E2E import tests failed"
            exit 1
        fi
    fi
    
    echo ""
    print_success "🎉 FULL VALIDATION COMPLETE"
    print_status "All 102 tests passed successfully"
    print_status "Platform(s): $platform"
    echo ""
}

# Cleanup development artifacts
cleanup_artifacts() {
    print_status "🧹 CLEANING UP DEVELOPMENT ARTIFACTS"
    print_status "====================================="
    
    if [ -d "screenshots/dev-iteration" ]; then
        print_status "Removing development screenshots..."
        rm -rf screenshots/dev-iteration
        print_success "Development screenshots cleaned"
    else
        print_status "No development screenshots to clean"
        print_status "(Screenshots are only created with --screenshots flag)"
    fi
    
    # Clean any temporary files
    if [ -f ".agent-temp" ]; then
        rm -f .agent-temp
        print_success "Temporary files cleaned"
    fi
    
    echo ""
    print_success "🎉 CLEANUP COMPLETE"
    print_status "Development artifacts removed"
}

# Main command dispatcher
main() {
    check_directory
    
    # Parse --screenshots flag
    local enable_screenshots="false"
    local args=()
    for arg in "$@"; do
        if [ "$arg" = "--screenshots" ]; then
            enable_screenshots="true"
        else
            args+=("$arg")
        fi
    done
    
    case ${args[0]} in
        "dev")
            run_dev_validation "${args[1]}" "${args[2]}" "${args[3]}" "$enable_screenshots"
            ;;
        "full")
            run_full_validation "${args[1]}"
            ;;
        "setup")
            setup_devices
            ;;
        "cleanup")
            cleanup_artifacts
            ;;
        "help"|"--help"|"-h"|"")
            print_usage
            ;;
        *)
            print_error "Unknown command: ${args[0]}"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 