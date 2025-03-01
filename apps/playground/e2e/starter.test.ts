import { beforeAll, describe, it } from '@jest/globals'
import { by, element, waitFor, expect as detoxExpect, device } from 'detox'

describe('Record Screen', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true, // Force a fresh instance
      launchArgs: { detoxDebug: 'true' } // Add debug info
    });
    
    // Navigate directly to the record tab using index to avoid ambiguity
    if (device.getPlatform() === 'android') {
      await element(by.text('Record')).atIndex(0).tap();
    } else {
      await element(by.label('Record')).atIndex(0).tap();
    }
    
    // Wait with a longer timeout
    await waitFor(element(by.id('record-screen-notice')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('should show start recording button', async () => {
    // First verify the record screen notice is visible
    await detoxExpect(element(by.id('record-screen-notice'))).toBeVisible();
    
    // Scroll down multiple times to ensure we reach the button
    // Using the same approach as in screenshots.test.ts
    if (device.getPlatform() === 'android') {
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
      await new Promise(resolve => setTimeout(resolve, 500));
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
      await new Promise(resolve => setTimeout(resolve, 500));
      await element(by.type('android.widget.ScrollView')).scroll(400, 'down');
    } else {
      await element(by.type('RCTScrollView')).scroll(400, 'down');
      await new Promise(resolve => setTimeout(resolve, 500));
      await element(by.type('RCTScrollView')).scroll(400, 'down');
      await new Promise(resolve => setTimeout(resolve, 500));
      await element(by.type('RCTScrollView')).scroll(400, 'down');
    }
    
    // Add a longer delay to ensure scrolling is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for the button
    await detoxExpect(element(by.id('start-recording-button'))).toBeVisible();
  });
});
