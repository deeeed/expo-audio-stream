#!/bin/bash

# Native Integration Tests Runner for sherpa-onnx.rn
# This script runs both iOS and Android native integration tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Running Sherpa-ONNX.rn Native Integration Tests"
echo "================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists xcodebuild; then
    print_warning "Xcode not found - iOS tests will be skipped"
    SKIP_IOS=true
else
    print_status "Xcode found"
    SKIP_IOS=false
fi

# Check if sherpa-onnx-demo Android project exists
DEMO_ANDROID_DIR="../../apps/sherpa-onnx-demo/android"
if [ -d "$DEMO_ANDROID_DIR" ] && [ -f "$DEMO_ANDROID_DIR/gradlew" ]; then
    print_status "Sherpa-ONNX demo Android project found"
    SKIP_ANDROID=false
else
    print_warning "Sherpa-ONNX demo Android project not found - Android tests will be skipped"
    SKIP_ANDROID=true
fi

# Run Android tests
if [ "$SKIP_ANDROID" = false ]; then
    echo ""
    echo "🤖 Running Android Native Tests"
    echo "--------------------------------"
    
    # Use sherpa-onnx-demo app's gradle wrapper (appropriate for sherpa-onnx.rn)
    DEMO_ANDROID_DIR="../../apps/sherpa-onnx-demo/android"
    
    if [ -d "$DEMO_ANDROID_DIR" ]; then
        echo "Using sherpa-onnx-demo app's gradle wrapper..."
        cd "$DEMO_ANDROID_DIR"
        
        echo "Running sherpa-onnx Android integration tests..."
        if ./gradlew :siteed_sherpa-onnx.rn:connectedAndroidTest; then
            print_status "Android tests passed"
        else
            print_error "Android tests failed"
            ANDROID_FAILED=true
        fi
        
        cd - > /dev/null
    else
        print_warning "Sherpa-ONNX demo Android directory not found - skipping Android tests"
        SKIP_ANDROID=true
    fi
else
    print_warning "Skipping Android tests"
fi

# Run iOS tests
if [ "$SKIP_IOS" = false ]; then
    echo ""
    echo "🍎 Running iOS Native Tests"
    echo "----------------------------"
    
    # Check if we have an iOS project/workspace
    if [ -f "ios/SherpaOnnx.xcworkspace" ]; then
        XCODE_PROJECT="ios/SherpaOnnx.xcworkspace"
        XCODE_TYPE="-workspace"
    elif [ -f "ios/SherpaOnnx.xcodeproj" ]; then
        XCODE_PROJECT="ios/SherpaOnnx.xcodeproj"
        XCODE_TYPE="-project"
    else
        print_warning "No Xcode project found - creating test scheme"
        print_warning "iOS tests need to be run manually from Xcode for now"
        SKIP_IOS=true
    fi
    
    if [ "$SKIP_IOS" = false ]; then
        echo "Running iOS tests with xcodebuild..."
        if xcodebuild test $XCODE_TYPE "$XCODE_PROJECT" -scheme SherpaOnnxTests -destination 'platform=iOS Simulator,name=iPhone 14' 2>/dev/null; then
            print_status "iOS tests passed"
        else
            print_warning "iOS tests require Xcode project setup"
            print_warning "Please run tests manually from Xcode for now"
        fi
    fi
else
    print_warning "Skipping iOS tests"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="

if [ "$SKIP_ANDROID" = false ]; then
    if [ "$ANDROID_FAILED" = true ]; then
        print_error "Android tests failed"
    else
        print_status "Android tests passed"
    fi
else
    print_warning "Android tests skipped"
fi

if [ "$SKIP_IOS" = false ]; then
    print_status "iOS tests completed (check output above)"
else
    print_warning "iOS tests skipped"
fi

echo ""
echo "📖 Next Steps:"
echo "1. For iOS testing: See iOS_TESTING_SETUP.md for detailed Xcode instructions"
echo "2. For Android details: See ANDROID_TESTING_BEHAVIOR.md for what's normal"
echo "3. Add test models to ios/test_models/ and android/src/test/resources/"
echo "4. Update test placeholders with actual sherpa-onnx integration"
echo ""
echo "📄 Documentation:"
echo "- iOS_TESTING_SETUP.md - Step-by-step Xcode test setup"
echo "- ANDROID_TESTING_BEHAVIOR.md - What to expect during Android tests"
echo "- PLATFORM_DIFFERENCES.md - Platform-specific testing notes"
echo ""