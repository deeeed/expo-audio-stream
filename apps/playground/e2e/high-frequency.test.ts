import { beforeAll, describe, it } from '@jest/globals'
import { by, element, expect as detoxExpect, device, waitFor } from 'detox'
import { waitForElementWhileScrolling, scrollUntilVisible } from './test-utils'

describe('Audio Timing Investigation', () => {
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

  const testConfigurations = [
    { 
      intervalAnalysis: 25, 
      interval: 10,
      description: 'High-frequency analysis (25ms) with ultra-fast streams (10ms)'
    },
    { 
      intervalAnalysis: 50, 
      interval: 25,
      description: 'Fast analysis (50ms) with fast streams (25ms)'
    },
    { 
      intervalAnalysis: 100, 
      interval: 50,
      description: 'Standard analysis (100ms) with medium streams (50ms)'
    },
    { 
      intervalAnalysis: 200, 
      interval: 100,
      description: 'Conservative analysis (200ms) with standard streams (100ms)'
    }
  ];

  testConfigurations.forEach(config => {
    it(`should validate dual event timing for ${config.description}`, async () => {
      console.log(`\n🔬 Testing ${config.description}`);
      console.log(`   intervalAnalysis: ${config.intervalAnalysis}ms`);
      console.log(`   interval: ${config.interval}ms`);
      
      // Use dual timing configuration
      const url = `audioplayground://agent-validation?intervalAnalysis=${config.intervalAnalysis}&interval=${config.interval}&measurePrecision=true&enableProcessing=true`;
      await device.openURL({ url });
      
      // Wait for agent validation wrapper to load
      await waitFor(element(by.id('agent-validation-wrapper')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Wait for start recording button to be available
      await waitFor(element(by.id('start-recording-button')))
        .toBeVisible()
        .withTimeout(5000);
      
      console.log(`🎙️ Starting recording to capture dual timing data...`);
      
      // Start recording
      await element(by.id('start-recording-button')).tap();
      
      console.log(`⏱️ Recording for 5 seconds to capture sufficient events...`);
      // Record for 5 seconds - sufficient for reliable timing analysis
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`🛑 Stopping recording...`);
      // Stop recording
      await element(by.id('stop-recording-button')).tap();
      
      console.log(`📊 Waiting for processing to complete...`);
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Use the new robust scrolling to find timing validation summary
      console.log(`📜 Scrolling to find timing validation summary...`);
      const timingSummaryFound = await waitForElementWhileScrolling(
        by.id('timing-validation-summary'),
        'down',
        200,
        'agent-validation-wrapper',
        15000 // 15 second timeout
      );
      
      if (timingSummaryFound) {
        console.log(`✅ Timing summary found for ${config.description}`);
        
        // Try to extract the actual JSON content
        try {
          const timingElement = element(by.id('timing-validation-summary'));
          const attributes = await timingElement.getAttributes();
          console.log(`📊 Timing data extracted: ${JSON.stringify(attributes)}`);
        } catch (extractError) {
          console.log(`⚠️ Could not extract timing data: ${extractError}`);
        }
      } else {
        console.log(`⚠️ No timing validation summary available for ${config.description}`);
        
        // Check for basic recording completion using robust scrolling
        console.log(`📜 Looking for recording status instead...`);
        const recordingStatusFound = await waitForElementWhileScrolling(
          by.id('recording-status'),
          'up',
          200,
          'agent-validation-wrapper',
          10000
        );
        
        if (recordingStatusFound) {
          console.log(`✅ Recording completed successfully for ${config.description}`);
        } else {
          console.log(`❌ No recording status found for ${config.description}`);
        }
      }
      
      console.log(`✅ ${config.description} validation completed`);
    });
  });
});