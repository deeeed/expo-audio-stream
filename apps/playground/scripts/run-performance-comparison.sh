#!/bin/bash
# Cross-Platform Performance Comparison Script  
# Runs stop recording performance tests on both Android and iOS to compare results
# 
# Part of: expo-audio-studio cross-platform performance optimization
# Usage: Validates performance improvements across platforms

echo "🚀 Stop Recording Performance Comparison"
echo "======================================"
echo ""

# Function to run performance test
run_performance_test() {
    local platform=$1
    local test_name=$2
    
    echo "📱 Running $test_name on $platform..."
    
    if [ "$platform" = "android" ]; then
        yarn e2e:android --testNamePattern="$test_name" --loglevel info
    else
        yarn e2e:ios --testNamePattern="$test_name" --loglevel info
    fi
}

# Check if specific duration is provided
if [ -n "$1" ]; then
    export PERF_TEST_DURATION=$1
    echo "Using custom duration: ${PERF_TEST_DURATION}s"
    echo ""
fi

# Run on Android
echo "=== ANDROID PERFORMANCE ==="
if adb devices | grep -q "device$"; then
    run_performance_test "android" "should measure 5-minute recording stop performance"
    sleep 2
    run_performance_test "android" "should run comparison test for both platforms"
else
    echo "❌ No Android device connected"
fi

echo ""
echo "=== iOS PERFORMANCE ==="
if xcrun simctl list devices | grep -q "Booted"; then
    run_performance_test "ios" "should measure 5-minute recording stop performance"
    sleep 2
    run_performance_test "ios" "should run comparison test for both platforms"
else
    echo "❌ No iOS simulator running"
fi

echo ""
echo "✅ Performance comparison complete!"
echo ""
echo "📊 Check the console output above for [PERF-RESULT] entries"
echo "Look for lines like:"
echo "  [PERF-RESULT] Android 5-minute recording: 81ms (25.12MB)"
echo "  [PERF-RESULT] iOS 5-minute recording: 45ms (25.12MB)"