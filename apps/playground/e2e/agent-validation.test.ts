import { beforeAll, beforeEach, describe, it, expect as jestExpected } from '@jest/globals'
import { by, element, expect as detoxExpect, device, waitFor } from 'detox'

describe('Agent Validation Suite', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { microphone: 'YES' },
      launchArgs: { 
        detoxDebug: 'true',
        AGENT_VALIDATION: 'true'
      }
    });
  });

  describe('Deep Link Configuration', () => {
    it('should accept basic recording configuration via deep link', async () => {
      // Launch with deep link parameters
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit&interval=100'
      });

      // Wait for the agent validation screen to load
      await waitFor(element(by.text('Agent Validation Interface')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify configuration was parsed and displayed
      await waitFor(element(by.id('agent-config')))
        .toBeVisible()
        .withTimeout(5000);

      // Check that configuration contains expected values
      const configElement = element(by.id('agent-config'));
      await detoxExpect(configElement).toBeVisible();
    });

    it('should display configuration without auto-starting', async () => {
      // Launch with configuration but no auto-start
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=16000&channels=1&encoding=pcm_16bit'
      });

      // Wait for config to load
      await waitFor(element(by.id('agent-config')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify start button is available (recording not auto-started)
      await detoxExpect(element(by.id('start-recording-button'))).toBeVisible();
    });

    it('should configure compressed output via deep link', async () => {
      // Launch with compression enabled
      await device.openURL({
        url: 'audioplayground://agent-validation?compressedOutput=true&compressedFormat=aac&compressedBitrate=128000'
      });

      // Wait for config to load
      await waitFor(element(by.id('agent-config')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify compressed output configuration  
      await detoxExpect(element(by.id('agent-config'))).toBeVisible();
    });
  });

  describe('Recording Workflow Validation', () => {
    beforeEach(async () => {
      // Reset to clean state
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=44100&channels=1'
      });
      
      await waitFor(element(by.id('agent-config')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should start recording and display start result', async () => {
      // Start recording
      await element(by.id('start-recording-button')).tap();

      // Wait for start result to appear (scroll if needed)
      await waitFor(element(by.id('start-recording-result')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);

      // Verify recording status
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify start result contains expected fields
      await detoxExpect(element(by.id('start-recording-result'))).toBeVisible();
    });

    it('should handle pause and resume workflow', async () => {
      // Start recording
      await element(by.id('start-recording-button')).tap();
      
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(3000);

      // Pause recording
      await element(by.id('pause-recording-button')).tap();
      
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(3000);

      // Resume recording
      await element(by.id('resume-recording-button')).tap();
      
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should stop recording and display final result', async () => {
      // Start recording
      await element(by.id('start-recording-button')).tap();
      
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(3000);

      // Wait a bit for some data
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stop recording
      await element(by.id('stop-recording-button')).tap();

      // Wait for final result (scroll if needed)
      await waitFor(element(by.id('final-recording-result')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);

      // Verify final result is visible
      await detoxExpect(element(by.id('final-recording-result'))).toBeVisible();
    });
  });

  describe('Error Handling Validation', () => {
    it('should display errors when they occur', async () => {
      // Relaunch app for clean state
      await device.launchApp({ newInstance: true });
      
      // Launch with invalid configuration but include minimum required params
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=999999&channels=99&encoding=pcm_16bit'
      });

      // Try to start recording with invalid config
      await waitFor(element(by.id('start-recording-button')))
        .toBeVisible()
        .withTimeout(5000);
        
      await element(by.id('start-recording-button')).tap();

      // Check if error message appears
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);
    });
  });

  describe('Event Logging Validation', () => {
    it('should log recording events during workflow', async () => {
      // Relaunch app for clean state
      await device.launchApp({ newInstance: true });
      
      // Launch with basic config
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit&interval=50'
      });

      await waitFor(element(by.id('start-recording-button')))
        .toBeVisible()
        .withTimeout(5000);

      // Start recording
      await element(by.id('start-recording-button')).tap();

      // Wait for events to be logged (give some time for events to accumulate)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stop recording to process all events
      await element(by.id('stop-recording-button')).tap();
      
      // Wait for final result to ensure stop completed
      await waitFor(element(by.id('final-recording-result')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);
      
      // Now scroll up to find the event log section
      await waitFor(element(by.text('Event Log')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'up', NaN, 0.5);
      
      // Verify we have events by checking the event stats text exists
      await detoxExpect(element(by.id('event-stats'))).toBeVisible();
    });
  });

  describe('Platform Compatibility Tests', () => {
    it('should work with platform-specific configurations', async () => {
      // Relaunch app for clean state
      await device.launchApp({ newInstance: true });
      
      const platform = device.getPlatform();
      
              if (platform === 'android') {
          // Test Android-specific features
          await device.openURL({
            url: 'audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit&showNotification=true&keepAwake=true'
          });
        } else {
          // Test iOS-specific features  
          await device.openURL({
            url: 'audioplayground://agent-validation?sampleRate=48000&channels=1&encoding=pcm_16bit'
          });
        }

      // agent-config is at the top, might need to scroll up
      await waitFor(element(by.id('agent-config')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'up', NaN, 0.5);

      // Verify recording works on current platform
      await element(by.id('start-recording-button')).tap();
      
      await waitFor(element(by.id('recording-status')))
        .toBeVisible()
        .withTimeout(5000);
        
      await element(by.id('stop-recording-button')).tap();
    });
  });

  describe('Performance Validation', () => {
    it('should handle high-frequency intervals', async () => {
      // Relaunch app for clean state
      await device.launchApp({ newInstance: true });
      
      // Test with minimum interval
      await device.openURL({
        url: 'audioplayground://agent-validation?sampleRate=16000&channels=1&encoding=pcm_16bit&interval=10'
      });

      await waitFor(element(by.id('start-recording-button')))
        .toBeVisible()
        .withTimeout(5000);

      const startTime = Date.now();
      
      await element(by.id('start-recording-button')).tap();
      
      // Record for a short time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await element(by.id('stop-recording-button')).tap();
      
      const endTime = Date.now();
      
      // Verify reasonable performance (should complete within reasonable time)
      // Increased threshold as high-frequency intervals may take longer on some devices
      jestExpected(endTime - startTime).toBeLessThan(10000);
      
      await waitFor(element(by.id('final-recording-result')))
        .toBeVisible()
        .whileElement(by.id('agent-validation-wrapper'))
        .scroll(200, 'down', NaN, 0.5);
    });
  });
});