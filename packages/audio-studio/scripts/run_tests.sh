#!/bin/bash

# Unified test runner for expo-audio-studio
# Usage: ./scripts/run_tests.sh [platform] [type]
# platform: all, android, ios (default: all)
# type: all, unit, instrumented, standalone (default: all)

set -e

PLATFORM=${1:-all}
TYPE=${2:-all}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Running expo-audio-studio tests"
echo "Platform: $PLATFORM"
echo "Type: $TYPE"
echo ""

# Function to run Android tests
run_android_tests() {
    echo "📱 Running Android tests..."
    cd "$PROJECT_ROOT/../../apps/playground/android" || exit 1
    
    if [ "$TYPE" = "all" ] || [ "$TYPE" = "unit" ]; then
        echo "  Running unit tests..."
        ./gradlew :siteed-expo-audio-studio:test
    fi
    
    if [ "$TYPE" = "all" ] || [ "$TYPE" = "instrumented" ]; then
        echo "  Running instrumented tests..."
        ./gradlew :siteed-expo-audio-studio:connectedAndroidTest
    fi
    
    cd - > /dev/null
}

# Function to run iOS tests
run_ios_tests() {
    echo "🍎 Running iOS tests..."
    cd "$PROJECT_ROOT/ios" || exit 1
    
    if [ "$TYPE" = "all" ] || [ "$TYPE" = "standalone" ]; then
        echo "  Running standalone tests..."
        
        # Track results
        local total_tests=0
        local passed_tests=0
        local failed_tests=0
        
        # Function to run a test and capture results
        run_ios_test() {
            local test_name=$1
            local test_file=$2
            
            echo ""
            echo "  📋 Running $test_name..."
            
            # Run the test and capture output
            local output=$(swift "$test_file" 2>&1)
            local exit_code=$?
            
            # Extract test results from output
            if [[ $output =~ Total:\ ([0-9]+) ]]; then
                local total="${BASH_REMATCH[1]}"
                total_tests=$((total_tests + total))
            fi
            
            if [[ $output =~ Passed:\ ([0-9]+) ]]; then
                local passed="${BASH_REMATCH[1]}"
                passed_tests=$((passed_tests + passed))
            fi
            
            if [[ $output =~ Failed:\ ([0-9]+) ]]; then
                local failed="${BASH_REMATCH[1]}"
                failed_tests=$((failed_tests + failed))
            fi
            
            # Show result
            if [ $exit_code -eq 0 ]; then
                echo -e "  ${GREEN}✅ $test_name: PASSED${NC}"
            else
                echo -e "  ${RED}❌ $test_name: FAILED${NC}"
                echo "$output" | grep -E "FAILED:|error:" | sed 's/^/    /'
            fi
        }
        
        # Run all tests
        run_ios_test "Basic Audio Tests" "standalone_test.swift"
        run_ios_test "Audio Processing Tests" "audio_processing_test.swift"
        run_ios_test "Audio Recording Tests" "audio_recording_test.swift"
        run_ios_test "Audio Streaming Tests" "audio_streaming_test.swift"
        
        # Summary
        echo ""
        echo "  iOS Test Summary:"
        echo "  Total Tests:  $total_tests"
        echo "  Passed:       $passed_tests"
        echo "  Failed:       $failed_tests"
    fi
    
    cd - > /dev/null
}

# Main execution
case $PLATFORM in
    android)
        run_android_tests
        ;;
    ios)
        run_ios_tests
        ;;
    all)
        run_android_tests
        echo ""
        run_ios_tests
        ;;
    *)
        echo -e "${RED}Invalid platform: $PLATFORM${NC}"
        echo "Usage: $0 [platform] [type]"
        echo "platform: all, android, ios"
        echo "type: all, unit, instrumented, standalone"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Test run complete!${NC}" 