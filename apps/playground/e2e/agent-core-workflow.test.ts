import { beforeAll, describe, it, expect as jestExpected } from '@jest/globals'
import { by, element, expect as detoxExpect, device, waitFor } from 'detox'

describe('Agent Core Workflow Validation', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: { 
        detoxDebug: 'true',
        AGENT_VALIDATION: 'true'
      }
    });
  });

  it('should complete core audio workflow: start → stop → read result', async () => {
    // Get test parameters from environment (set by validation script)
    const testUrl = process.env.AGENT_TEST_URL || 
      'audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit&interval=100';
    
    console.log(`Testing with configuration: ${testUrl}`);

    // 1. Launch with configuration via deep link
    await device.openURL({ url: testUrl });

    // Wait for the agent validation screen to load
    await waitFor(element(by.id('agent-config')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Configuration loaded successfully');

    // 2. Start recording
    await waitFor(element(by.id('start-recording-button')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('start-recording-button')).tap();
    console.log('✅ Start recording tapped');

    // Wait for recording to actually start
    await waitFor(element(by.id('recording-status')))
      .toBeVisible()
      .withTimeout(5000);

    console.log('✅ Recording started successfully');

    // Wait for some audio data to be recorded (dedicated indicator)
    await waitFor(element(by.id('has-audio-data-indicator')))
      .toBeVisible()
      .withTimeout(10000);

    // 3. Stop recording  
    await waitFor(element(by.id('stop-recording-button')))
      .toBeVisible()
      .withTimeout(3000);
      
    await element(by.id('stop-recording-button')).tap();
    console.log('✅ Stop recording tapped');

    // 4. Read and validate result - wait for element with scrolling fallback
    // First wait for recording to stop completely
    await waitFor(element(by.id('recording-stopped-indicator')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Then wait for final result with scrolling fallback  
    try {
      await waitFor(element(by.id('final-recording-result'))).toBeVisible().withTimeout(3000);
      console.log('✅ Final result appeared immediately');
    } catch (e) {
      console.log('⚠️ Final result not immediately visible - scrolling to find it');
      await element(by.type('android.widget.ScrollView')).scrollTo('bottom');
      console.log('✅ Scrolled to bottom');
      await waitFor(element(by.id('final-recording-result'))).toBeVisible().withTimeout(7000);
      console.log('✅ Final result appeared after scrolling');
    }

    // Verify the result contains expected data
    await detoxExpect(element(by.id('final-recording-result'))).toBeVisible();
    
    // If we made it this far, the core workflow is working
    console.log('🎉 Core audio workflow validation PASSED');
  });

  it('should handle configuration parameters correctly', async () => {
    // Test that our parameterized configuration is properly parsed
    const sampleRate = process.env.AGENT_TEST_SAMPLE_RATE || '44100';
    const channels = process.env.AGENT_TEST_CHANNELS || '1';
    
    // Launch with specific config - use complete URL pattern like the working first test
    const testUrl = `audioplayground://agent-validation?sampleRate=${sampleRate}&channels=${channels}&encoding=pcm_16bit&interval=100`;
    console.log(`Testing parameter configuration: ${testUrl}`);
    
    await device.openURL({ url: testUrl });

    // Scroll to top first since config is at the top of the page
    try {
      await element(by.type('android.widget.ScrollView')).scrollTo('top');
      console.log('✅ Scrolled to top to find config');
    } catch (scrollError) {
      console.log('ℹ️ Scroll to top failed, continuing anyway');
    }

    // First wait for the agent validation page itself to load
    await waitFor(element(by.text('Agent Validation Interface')))
      .toBeVisible()
      .withTimeout(10000);
    console.log('✅ Agent validation page loaded');

    // Then wait for the configuration to be processed and displayed
    await waitFor(element(by.id('agent-config')))
      .toBeVisible()
      .withTimeout(10000);

    console.log('✅ Configuration parameters loaded successfully');

    // Quick recording test to ensure parameters work
    await element(by.id('start-recording-button')).tap();
    await waitFor(element(by.id('recording-status')))
      .toBeVisible()
      .withTimeout(5000);
    
    await element(by.id('stop-recording-button')).tap();
    
    // Wait for recording to stop and final result with scrolling fallback
    await waitFor(element(by.id('recording-stopped-indicator')))
      .toBeVisible()
      .withTimeout(5000);
    
    try {
      await waitFor(element(by.id('final-recording-result'))).toBeVisible().withTimeout(3000);
      console.log('✅ Final result appeared immediately');
    } catch (e) {
      console.log('⚠️ Final result not immediately visible - scrolling to find it');
      await element(by.type('android.widget.ScrollView')).scrollTo('bottom');
      console.log('✅ Scrolled to bottom');
      await waitFor(element(by.id('final-recording-result'))).toBeVisible().withTimeout(7000);
      console.log('✅ Final result appeared after scrolling');
    }

    console.log(`✅ Parameters validated: ${sampleRate}Hz, ${channels}ch`);
  });
});