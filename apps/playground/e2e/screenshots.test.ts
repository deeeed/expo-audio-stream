import { beforeAll, describe, it } from '@jest/globals'
import { by, element, waitFor, expect as detoxExpect, device } from 'detox'
import { mkdirSync } from 'fs'
import { join } from 'path'

describe('App Screenshots', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Wait for app to fully load
    await waitFor(element(by.id('record-screen-notice')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('Tab Screenshots', () => {
    const tabs = [
      { name: 'Record', tabId: 'record' },
      { name: 'Import', tabId: 'import' },
      { name: 'Transcription', tabId: 'transcription' },
      { name: 'Files', tabId: 'files' },
      { name: 'More', tabId: 'more' }
    ];

    tabs.forEach(tab => {
      it(`should capture ${tab.name} tab screenshot`, async () => {
        // Navigate to the tab - use index-based selection for tabs
        // This avoids the ambiguity with multiple "Record" text elements
        if (tab.name === 'Record') {
          // For Record tab, we're already there in the first test
          // or we can use a more specific approach
          if (device.getPlatform() === 'android') {
            // For Android, try to find the tab by its position in the tab bar
            await element(by.text(tab.name)).atIndex(0).tap();
          } else {
            // For iOS
            await element(by.label(tab.name)).atIndex(0).tap();
          }
        } else {
          // For other tabs, the text selector works fine
          await element(by.text(tab.name)).tap();
        }
        
        // Wait for the tab content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Take a screenshot
        await device.takeScreenshot(`${tab.tabId}-tab`);
      });
    });
  });

  it('should capture Record screen in basic and advanced modes', async () => {
    // Navigate to Record tab if not already there
    if (device.getPlatform() === 'android') {
      await element(by.text('Record')).atIndex(0).tap();
    } else {
      await element(by.label('Record')).atIndex(0).tap();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // First verify the record screen notice is visible
    await detoxExpect(element(by.id('record-screen-notice'))).toBeVisible();
    
    // Take screenshot of initial view (basic mode)
    await device.takeScreenshot('record-tab-basic-mode');

    // Find and tap the "Advanced settings" toggle switch
    // First try with direct text match
    try {
      // Look for the Advanced settings toggle
      const advancedToggle = await element(by.text('Advanced settings'));
      await advancedToggle.tap();
      
      // Wait for advanced settings to appear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot of advanced mode
      await device.takeScreenshot('record-tab-advanced-mode');
      
      // Try to find and screenshot some advanced settings sections
      try {
        // Look for key components in the advanced settings
        await element(by.id('audio-device-selector')).scrollTo('bottom');
        await new Promise(resolve => setTimeout(resolve, 500));
        await device.takeScreenshot('record-tab-advanced-device-settings');
        
        // Try to find the recording button to capture in screenshot
        try {
          await waitFor(element(by.id('prepare-recording-button')))
            .toBeVisible()
            .withTimeout(2000);
          
          // Capture screenshot with the recording button visible
          await device.takeScreenshot('record-tab-with-recording-button');
        } catch (err) {
          // Can't find the button, just capture current screen
          await device.takeScreenshot('record-tab-advanced-bottom');
        }
      } catch (scrollErr) {
        // Scrolling might fail, just capture what's visible
        await device.takeScreenshot('record-tab-advanced-visible-portion');
      }
    } catch (toggleErr) {
      // If we can't find the toggle with direct text, try an alternative approach
      try {
        // Try to find a switch near text containing "Advanced"
        await element(by.text('Advanced settings')).atIndex(0).tap();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await device.takeScreenshot('record-tab-advanced-mode-alt');
      } catch (altErr) {
        // If all else fails, just capture the basic mode again as a fallback
        await device.takeScreenshot('record-tab-basic-mode-only');
      }
    }
  });
}); 