#!/bin/bash
# E2E Performance Tests for Stop Recording Operations
# Validates cross-platform stop recording performance using agent validation workflow
# 
# Part of: expo-audio-studio cross-platform performance optimization
# Tests: Stop recording performance across various durations and platforms

set -e

SCRIPT_NAME="run-e2e-performance-tests.sh"

echo "🎯 E2E Stop Recording Performance Tests"
echo "========================================"

# Parse arguments
PLATFORM=$1
DURATION=$2

# Set default duration if not provided
if [ -z "$DURATION" ]; then
    echo "ℹ️  Using default test durations (30s, 1m, 5m)"
    DURATION=""
else
    echo "⏱️  Custom duration: ${DURATION}s"
    export PERF_TEST_DURATION=$DURATION
fi

echo ""

# Run on Android
if [ "$PLATFORM" = "android" ] || [ -z "$PLATFORM" ]; then
    echo "🤖 Testing on Android..."
    yarn detox test -c android.att.debug e2e/stop-recording-performance.test.ts
fi

# Run on iOS  
if [ "$PLATFORM" = "ios" ] || [ -z "$PLATFORM" ]; then
    echo "🍎 Testing on iOS..."
    yarn detox test -c ios.sim.debug e2e/stop-recording-performance.test.ts
fi

echo ""
echo "📖 Usage: ./${SCRIPT_NAME} [platform] [duration_seconds]"
echo "Examples:"
echo "  ./${SCRIPT_NAME}                    # Run all platforms, default durations"
echo "  ./${SCRIPT_NAME} android            # Run Android only, default durations"  
echo "  ./${SCRIPT_NAME} ios 600            # Run iOS only, 10-minute test"
echo "  ./${SCRIPT_NAME} android 300        # Run Android only, 5-minute test"
echo ""
echo "📁 Test files:"
echo "  - e2e/stop-recording-performance.test.ts"
echo "  - scripts/run-performance-comparison.sh"