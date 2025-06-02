#!/bin/bash

# Integration tests for new features in expo-audio-studio
# This script runs all integration tests to validate ACTUAL platform behavior

echo "🧪 Running expo-audio-studio iOS Integration Tests"
echo "=================================================="
echo ""

# Change to the directory containing this script
cd "$(dirname "$0")"

# Make test scripts executable
chmod +x *.swift

echo "1️⃣  Buffer Duration Test"
echo "========================="
swift buffer_duration_test.swift
echo ""

echo "2️⃣  Output Control Test"
echo "========================"
swift output_control_test.swift
echo ""

echo "3️⃣  Buffer and Fallback Test"
echo "============================"
swift buffer_and_fallback_test.swift
echo ""

echo "4️⃣  Compressed-Only Output Test (Issue #244)"
echo "==========================================="
swift compressed_only_output_test.swift
echo ""

echo "5️⃣  Compressed-Only Output Real Test (Issue #244)"
echo "=============================================="
swift compressed_only_output_real_test.swift
echo ""

echo "6️⃣  Compressed-Only Output Integration Test (With AudioStreamManager)"
echo "=================================================================="
if [ -f "./run_compressed_only_test.sh" ]; then
    ./run_compressed_only_test.sh
else
    echo "⚠️  Test runner not found, using direct Swift execution"
    swift compressed_only_real_integration_test.swift
fi
echo ""

echo "✅ Integration tests validate real iOS behavior"
echo "✅ Tests must pass before merging any feature!" 