#!/bin/bash

# Storybook Validation Script
# Provides fast feedback loops for story development

set -e

echo "🔄 STORYBOOK VALIDATION"
echo "======================"

# Configuration
STORYBOOK_URL="http://localhost:7365"
VALIDATION_DIR="./logs/storybook-validation"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$VALIDATION_DIR/validation-$TIMESTAMP.log"

# Create validation directory
mkdir -p "$VALIDATION_DIR"

echo "📋 Starting validation at $TIMESTAMP" | tee "$LOG_FILE"

# 1. Basic compilation check
echo "🔍 Checking TypeScript compilation..." | tee -a "$LOG_FILE"
TS_OUTPUT=$(yarn tsc --noEmit --skipLibCheck 2>&1)
TS_EXIT_CODE=$?
echo "$TS_OUTPUT" | tee -a "$LOG_FILE"

# Check for actual errors (not warnings)
if [ $TS_EXIT_CODE -ne 0 ]; then
    echo "❌ TypeScript compilation FAILED with exit code $TS_EXIT_CODE" | tee -a "$LOG_FILE"
    exit 1
else
    echo "✅ TypeScript compilation OK" | tee -a "$LOG_FILE"
fi

# 2. ESLint check for stories
echo "🧹 Checking ESLint for stories..." | tee -a "$LOG_FILE"
if yarn lint src/components/ 2>&1 | tee -a "$LOG_FILE"; then
    echo "✅ ESLint OK" | tee -a "$LOG_FILE"
else
    echo "❌ ESLint FAILED" | tee -a "$LOG_FILE"
    exit 1
fi

# 3. Story file structure test
echo "📚 Testing story file structure..." | tee -a "$LOG_FILE"
if [ -f "ui-components/TestButton.stories.tsx" ]; then
    echo "✅ TestButton story file exists" | tee -a "$LOG_FILE"
    # Check basic story structure
    if grep -q "export default" ui-components/TestButton.stories.tsx && \
       grep -q "export const" ui-components/TestButton.stories.tsx; then
        echo "✅ Story file has proper exports" | tee -a "$LOG_FILE"
    else
        echo "❌ Story file missing proper exports" | tee -a "$LOG_FILE"
        exit 1
    fi
else
    echo "❌ TestButton story file missing" | tee -a "$LOG_FILE"
    exit 1
fi

# 4. Storybook server start test
echo "🚀 Testing Storybook server startup..." | tee -a "$LOG_FILE"
(EXPO_PUBLIC_STORYBOOK=true yarn start --port 7365 > /tmp/storybook-start.log 2>&1 &)
METRO_PID=$!

# Wait for server to start (max 30 seconds)
echo "⏳ Waiting for Metro server..." | tee -a "$LOG_FILE"
for i in {1..30}; do
    if curl -s "$STORYBOOK_URL" > /dev/null 2>&1; then
        echo "✅ Metro server is responding" | tee -a "$LOG_FILE"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Metro server failed to start" | tee -a "$LOG_FILE"
        kill $METRO_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# 5. Bundle compilation test
echo "📦 Testing bundle compilation..." | tee -a "$LOG_FILE"
BUNDLE_RESPONSE=$(curl -s "http://localhost:7365/index.bundle?platform=ios&dev=true" | head -c 200)
if echo "$BUNDLE_RESPONSE" | grep -q "var __BUNDLE_START_TIME__"; then
    echo "✅ Bundle compiles successfully" | tee -a "$LOG_FILE"
else
    echo "❌ Bundle compilation failed" | tee -a "$LOG_FILE"
    echo "Response: $BUNDLE_RESPONSE" | tee -a "$LOG_FILE"
    kill $METRO_PID 2>/dev/null || true
    exit 1
fi

# Clean up
kill $METRO_PID 2>/dev/null || true

echo "🎉 All validations passed!" | tee -a "$LOG_FILE"
echo "📄 Full log: $LOG_FILE"

# Summary
echo ""
echo "📊 VALIDATION SUMMARY"
echo "===================="
echo "✅ TypeScript compilation"
echo "✅ ESLint checks"  
echo "✅ Story imports"
echo "✅ Metro server startup"
echo "✅ Bundle compilation"
echo ""
echo "🚀 Ready for Storybook development!"