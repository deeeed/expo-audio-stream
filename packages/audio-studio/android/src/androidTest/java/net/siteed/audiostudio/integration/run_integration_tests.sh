#!/bin/bash

# Android Integration Tests for Buffer Duration & Skip File Writing
# Run this script from the expo-audio-studio package root

echo "🚀 Running Android Integration Tests"
echo "===================================="
echo ""

# Navigate to playground app (which has the gradle wrapper)
cd ../../../apps/playground/android || exit 1

echo "📱 Running Buffer Duration Integration Test..."
echo "--------------------------------------------"
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.BufferDurationIntegrationTest"

echo ""
echo "📱 Running Skip File Writing Integration Test..."
echo "-----------------------------------------------"
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.SkipFileWritingIntegrationTest"

echo ""
echo "📱 Running Output Control Integration Test..."
echo "--------------------------------------------"
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.OutputControlIntegrationTest"

echo ""
echo "📱 Running Compressed-Only Output Test (Issue #244)..."
echo "-----------------------------------------------------"
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.CompressedOnlyOutputTest"

echo ""
echo "📱 Running Audio Focus Strategy Integration Test..."
echo "--------------------------------------------------"
./gradlew :siteed-expo-audio-studio:connectedAndroidTest --tests "*.AudioFocusStrategyIntegrationTest"

echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "Check the test reports at:"
echo "packages/audio-studio/android/build/reports/androidTests/connected/index.html"
echo ""
echo "✅ Integration tests completed!" 