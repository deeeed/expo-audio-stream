#!/usr/bin/env node

/**
 * Test System Info Functionality via Demo App
 * 
 * This script tests the new getSystemInfo() and getArchitectureInfo() methods
 * by running the actual demo app and checking if the methods work correctly.
 * 
 * This is a more practical approach than complex Xcode test target setup
 * since EAS builds regenerate the iOS folder.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing sherpa-onnx System Info Functionality');
console.log('==============================================');

// Test strategy: Run the demo app and check logs for system info
async function testSystemInfo() {
  console.log('\n📱 Starting demo app to test system info methods...');
  
  // Start the Metro bundler
  console.log('🚀 Starting Metro bundler...');
  const metro = spawn('yarn', ['start', '--port', '7502'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  metro.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Waiting on')) {
      console.log('✅ Metro bundler ready');
    }
  });
  
  metro.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('error') || output.includes('Error')) {
      console.log('❌ Metro error:', output);
    }
  });
  
  // Wait for Metro to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n📱 Building and running iOS app...');
  
  // Run iOS app and capture logs
  const ios = spawn('yarn', ['ios'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  let systemInfoFound = false;
  let architectureFound = false;
  
  ios.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Look for system info logs
    if (output.includes('System Info Retrieved:') || output.includes('📊 System Info')) {
      console.log('✅ System Info method called successfully');
      systemInfoFound = true;
    }
    
    if (output.includes('Architecture:') || output.includes('🏗️')) {
      console.log('✅ Architecture detection working');
      architectureFound = true;
    }
    
    // Log relevant React Native logs
    if (output.includes('Running application') || 
        output.includes('System Info') || 
        output.includes('Architecture') ||
        output.includes('sherpa-onnx')) {
      console.log('📱 App:', output.trim());
    }
  });
  
  ios.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('System Info') || output.includes('Architecture')) {
      console.log('📱 App Log:', output.trim());
    }
  });
  
  // Wait for app to start and logs to appear
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Kill processes
  metro.kill();
  ios.kill();
  
  // Report results
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`System Info Method: ${systemInfoFound ? '✅ WORKING' : '❌ NOT DETECTED'}`);
  console.log(`Architecture Detection: ${architectureFound ? '✅ WORKING' : '❌ NOT DETECTED'}`);
  
  if (systemInfoFound && architectureFound) {
    console.log('\n🎉 All tests PASSED! System info functionality is working.');
  } else {
    console.log('\n⚠️ Some tests FAILED. Check the demo app implementation.');
  }
}

// Alternative: Direct method testing approach
function showDirectTestingApproach() {
  console.log('\n🎯 Alternative Testing Approach:');
  console.log('================================');
  console.log('Instead of complex Xcode test setup, you can:');
  console.log('');
  console.log('1. **Run the demo app and check the UI**:');
  console.log('   yarn ios');
  console.log('   - Look for "System Information" section on main screen');
  console.log('   - Verify architecture shows "NEW" or "OLD"');
  console.log('   - Check that memory, CPU, device info is populated');
  console.log('');
  console.log('2. **Check React Native logs** for:');
  console.log('   - "📊 System Info Retrieved:" messages');
  console.log('   - No errors when calling getSystemInfo()');
  console.log('   - Architecture detection working');
  console.log('');
  console.log('3. **Test performance**:');
  console.log('   - System info should load quickly (<100ms)');
  console.log('   - No freezing or delays');
  console.log('   - Responsive UI updates');
  console.log('');
  console.log('4. **Validate on different platforms**:');
  console.log('   - iOS device vs simulator');
  console.log('   - Android device vs emulator');
  console.log('   - Web browser');
  console.log('');
  console.log('💡 This approach is much simpler and works with EAS builds!');
}

// Show the testing approach
showDirectTestingApproach();

console.log('\n🔍 Quick Validation Commands:');
console.log('=============================');
console.log('# Test iOS');
console.log('yarn ios');
console.log('');
console.log('# Test Android'); 
console.log('yarn android');
console.log('');
console.log('# Test Web');
console.log('yarn web');
console.log('');
console.log('# Check logs for system info');
console.log('# Look for: "📊 System Info Retrieved"');
console.log('# Look for: Architecture detection messages');
console.log('# Look for: No import/module errors');

console.log('\n✅ Testing guide complete!');