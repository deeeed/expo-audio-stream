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

echo "✅ Integration tests validate real iOS behavior"
echo "✅ Tests must pass before merging any feature!" 