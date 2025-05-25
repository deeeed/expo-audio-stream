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

echo "2️⃣  Skip File Writing Test"
echo "============================"
swift skip_file_writing_test.swift
echo ""

echo "✅ Integration tests validate real iOS behavior"
echo "✅ Tests must pass before merging any feature!" 