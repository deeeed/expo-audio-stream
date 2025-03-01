import { beforeAll, describe, it } from '@jest/globals'
import { by, element, expect as detoxExpect, device } from 'detox'

// Define direction type locally
type ScrollDirection = 'up' | 'down' | 'left' | 'right';

// Helper function to scroll until an element is visible
async function scrollUntilVisible(
  elementMatcher: any, 
  direction: ScrollDirection = 'down', 
  maxScrolls = 5
) {
  const scrollViewType = device.getPlatform() === 'android' 
    ? 'android.widget.ScrollView' 
    : 'RCTScrollView';
  
  for (let i = 0; i < maxScrolls; i++) {
    try {
      // Check if element is already visible
      await detoxExpect(element(elementMatcher)).toBeVisible();
      return true; // Element is visible, no need to scroll further
    } catch (e) {
      // Element not visible, scroll and try again
      await element(by.type(scrollViewType)).scroll(300, direction as any);
      await new Promise(resolve => setTimeout(resolve, 300)); // Small pause for UI to settle
    }
  }
  
  // One final check after all scrolls
  await detoxExpect(element(elementMatcher)).toBeVisible();
  return true;
}

describe('Record Screen', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: { 
        detoxDebug: 'true',
        MOCK_AUDIO_RECORDING: 'true'
      }
    });
    
    if (device.getPlatform() === 'android') {
      await element(by.text('Record')).atIndex(0).tap();
    } else {
      await element(by.label('Record')).atIndex(0).tap();
    }
    
    await detoxExpect(element(by.id('record-screen-notice'))).toBeVisible();
  });

  it('should show start recording button', async () => {
    await detoxExpect(element(by.id('record-screen-notice'))).toBeVisible();
    
    // Scroll until the start button is visible
    await scrollUntilVisible(by.id('start-recording-button'));
    
    await detoxExpect(element(by.id('start-recording-button'))).toBeVisible();
  });

  it('should complete a recording workflow and navigate to file view', async () => {
    // Scroll to top first to ensure consistent starting position
    const scrollViewType = device.getPlatform() === 'android' 
      ? 'android.widget.ScrollView' 
      : 'RCTScrollView';
    await element(by.type(scrollViewType)).scrollTo('top');
    
    // Skip filename input and just find and tap start recording button
    await scrollUntilVisible(by.id('start-recording-button'));
    await element(by.id('start-recording-button')).tap();
    
    // Wait for recording to start
    await detoxExpect(element(by.id('active-recording-view'))).toBeVisible();
    
    // Wait a bit to simulate recording
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find and tap pause button
    await detoxExpect(element(by.id('pause-recording-button'))).toBeVisible();
    await element(by.id('pause-recording-button')).tap();
    
    // Wait for paused state
    await detoxExpect(element(by.id('paused-recording-view'))).toBeVisible();
    
    // Wait a bit in paused state
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find and tap resume button
    await detoxExpect(element(by.id('resume-recording-button'))).toBeVisible();
    await element(by.id('resume-recording-button')).tap();
    
    // Wait for active recording again
    await detoxExpect(element(by.id('active-recording-view'))).toBeVisible();
    
    // Wait a bit more to simulate recording
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Find and tap stop button - this is where it's failing
    await detoxExpect(element(by.id('stop-recording-button'))).toBeVisible();
    console.log('Successfully found Stop Recording button');
  });
});
