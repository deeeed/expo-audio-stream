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
      { name: 'Preview', tabId: 'preview' },
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

  it('should capture Record screen with scrolled content', async () => {
    // Navigate to Record tab if not already there
    // Use the same approach as above for consistency
    if (device.getPlatform() === 'android') {
      await element(by.text('Record')).atIndex(0).tap();
    } else {
      await element(by.label('Record')).atIndex(0).tap();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // First verify the record screen notice is visible
    await detoxExpect(element(by.id('record-screen-notice'))).toBeVisible();
    
    // Take screenshot of initial view
    await device.takeScreenshot('record-tab-initial');
    
    // Scroll down to see more content
    if (device.getPlatform() === 'android') {
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
    } else {
      await element(by.type('RCTScrollView')).scroll(400, 'down');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await device.takeScreenshot('record-tab-scrolled-1');
    
    // Scroll again
    if (device.getPlatform() === 'android') {
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
    } else {
      await element(by.type('RCTScrollView')).scroll(400, 'down');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    await device.takeScreenshot('record-tab-scrolled-2');
    
    // Final scroll to see the button
    if (device.getPlatform() === 'android') {
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
    } else {
      await element(by.type('RCTScrollView')).scroll(400, 'down');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the button is visible and take screenshot
    await detoxExpect(element(by.id('start-recording-button'))).toBeVisible();
    await device.takeScreenshot('record-tab-with-button');
  });
}); 