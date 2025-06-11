import { beforeEach, describe, it, expect, afterAll } from '@jest/globals'
import { by, element, device, waitFor } from 'detox'

describe('Stop Recording Performance Validation', () => {
  // Get custom duration from environment variable if set
  const customDuration = process.env.PERF_TEST_DURATION ? parseInt(process.env.PERF_TEST_DURATION) : null;
  
  beforeEach(async () => {
    // Use agent validation workflow
    await device.launchApp({
      newInstance: true,
      permissions: { microphone: 'YES' },
      launchArgs: { 
        detoxDebug: 'true',
        AGENT_VALIDATION: 'true'
      }
    });
  });

  const runPerformanceTest = async (durationSeconds: number) => {
    const durationLabel = durationSeconds < 60 ? `${durationSeconds}s` : `${durationSeconds/60}m`;
    console.log(`\n🎯 AGENT VALIDATION: Stop recording performance for ${durationLabel} on ${device.getPlatform()}`);
    
    // Step 1: Configure via deep link
    await device.openURL({
      url: `audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit&keepAwake=true`
    });

    // Step 2: Validate configuration loaded
    await waitFor(element(by.id('agent-config')))
      .toBeVisible()
      .withTimeout(10000);
    console.log('✅ Agent validation configured');
    
    // Step 3: Start recording
    await element(by.id('start-recording-button')).tap();
    
    // Step 4: Validate recording started
    await waitFor(element(by.id('recording-active-indicator')))
      .toExist()
      .withTimeout(5000);
    
    await waitFor(element(by.id('start-recording-result')))
      .toBeVisible()
      .whileElement(by.id('agent-validation-wrapper'))
      .scroll(200, 'down', NaN, 0.5);
    console.log('✅ Recording started');

    // Step 5: Record for specified duration
    console.log(`⏱️  Recording for ${durationLabel}...`);
    await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));

    // Step 6: Stop recording
    await element(by.id('stop-recording-button')).tap();
    console.log('🔴 Stop recording triggered');

    // Step 7: Validate recording stopped
    await waitFor(element(by.id('recording-stopped-indicator')))
      .toExist()
      .withTimeout(10000);
    
    // Step 8: Extract performance metrics
    await waitFor(element(by.id('stop-time-result')))
      .toBeVisible()
      .whileElement(by.id('agent-validation-wrapper'))
      .scroll(200, 'down', NaN, 0.5);

    let stopTimeMs = -1;
    let fileSize = 'N/A';
    
    try {
      const stopTimeElement = await element(by.id('stop-time-result')).getAttributes();
      if (stopTimeElement && 'text' in stopTimeElement && stopTimeElement.text) {
        stopTimeMs = parseInt(stopTimeElement.text.replace('ms', '').trim());
      }
    } catch (e) {
      console.log('⚠️  Could not extract stop time');
    }

    try {
      await waitFor(element(by.id('final-recording-result')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);
        
      const finalResultElement = await element(by.id('final-recording-result')).getAttributes();
      if (finalResultElement && 'text' in finalResultElement && finalResultElement.text) {
        const result = JSON.parse(finalResultElement.text);
        fileSize = (result.size / (1024 * 1024)).toFixed(2) + 'MB';
      }
    } catch (e) {
      console.log('⚠️  Could not extract file size');
    }

    // Step 9: Report results
    console.log('\n📊 AGENT VALIDATION RESULT:');
    console.log('=====================================');
    console.log(`Platform: ${device.getPlatform()}`);
    console.log(`Duration: ${durationLabel}`);
    console.log(`Stop Time: ${stopTimeMs}ms`);
    console.log(`File Size: ${fileSize}`);
    console.log('=====================================\n');
    
    return { 
      platform: device.getPlatform(),
      duration: durationSeconds,
      stopTimeMs,
      fileSize 
    };
  };

  // Performance validation tests
  if (customDuration) {
    // Calculate appropriate timeout: recording duration + 60s for setup/teardown + 20% buffer
    const testTimeout = (customDuration + 60) * 1.2 * 1000; // Convert to milliseconds
    
    // Run only custom duration test if specified
    it(`should validate ${customDuration}-second recording stop performance`, async () => {
      const result = await runPerformanceTest(customDuration);
      
      expect(result.stopTimeMs).toBeGreaterThan(0);
      
      // Dynamic threshold based on duration
      let threshold = 200; // Default for short recordings
      if (customDuration > 60) threshold = 500;
      if (customDuration > 300) threshold = 750;
      if (customDuration > 600) threshold = 1000;
      
      // Platform-specific adjustments
      if (device.getPlatform() === 'ios' && customDuration >= 60) {
        console.log(`⚠️  WARNING: Testing iOS performance fix for ${customDuration}s recording`);
        // With our fix, iOS should now meet the same targets
      }
      
      expect(result.stopTimeMs).toBeLessThan(threshold);
      console.log(`✅ PASS: ${result.stopTimeMs}ms < ${threshold}ms target`);
    }, testTimeout);
  } else {
    // Default test suite
    it('should validate 30-second recording stop performance', async () => {
      const result = await runPerformanceTest(30);
      
      expect(result.stopTimeMs).toBeGreaterThan(0);
      expect(result.stopTimeMs).toBeLessThan(200);
      console.log(`✅ PASS: ${result.stopTimeMs}ms < 200ms target`);
    });

    it('should validate 1-minute recording stop performance', async () => {
      const result = await runPerformanceTest(60);
      
      expect(result.stopTimeMs).toBeGreaterThan(0);
      expect(result.stopTimeMs).toBeLessThan(500);
      console.log(`✅ PASS: ${result.stopTimeMs}ms < 500ms target`);
    });

    it('should validate 5-minute recording stop performance', async () => {
      const result = await runPerformanceTest(300);
      
      expect(result.stopTimeMs).toBeGreaterThan(0);
      expect(result.stopTimeMs).toBeLessThan(750);
      console.log(`✅ PASS: ${result.stopTimeMs}ms < 750ms target`);
    });
  }

  // Summary report
  afterAll(() => {
    console.log('\n🏁 AGENT VALIDATION SUMMARY');
    console.log('===========================');
    console.log('Stop recording performance validated using agent workflow');
    console.log('Check individual test results above for platform-specific metrics');
  });
});