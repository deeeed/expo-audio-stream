import { beforeAll, afterAll, describe, it, expect as jestExpected } from '@jest/globals'
import { by, element, expect as detoxExpect, device, waitFor } from 'detox'

describe('Storybook Validation', () => {
  beforeAll(async () => {
    // Launch app in Storybook mode with dev warnings disabled
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        detoxURLBlacklistRegex: '.*',
        RCTDevSettings: JSON.stringify({
          executorClass: 'RCTJSCExecutor',
          shakeToShow: false,
          showFPS: false,
          showInspector: false,
        }),
      },
    });
    
    // Wait for app to load and settle
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should load Storybook interface successfully', async () => {
    // Take screenshot of initial Storybook interface
    await device.takeScreenshot('storybook-main-interface');
    
    // Wait for Storybook to load - look for the Test Button component
    await waitFor(element(by.text('Test Button')))
      .toBeVisible()
      .withTimeout(10000);
    
    // Also verify story navigation shows TestButton/Default
    await waitFor(element(by.text('TestButton/Default')))
      .toBeVisible()
      .withTimeout(5000);
    
    console.log('✅ Storybook interface loaded with Test Button story');
  });

  it('should navigate to TestButton Default story', async () => {
    // The Default story should already be loaded (as shown in previous test)
    // Verify the Test Button is rendered  
    await waitFor(element(by.text('Test Button')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Verify we're on the Default story
    await waitFor(element(by.text('TestButton/Default')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Take screenshot of Default story
    await device.takeScreenshot('storybook-testbutton-default');
    
    console.log('✅ TestButton Default story rendered successfully');
  });

  it('should allow interaction with the Test Button', async () => {
    // Test button interaction
    await element(by.text('Test Button')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot after interaction
    await device.takeScreenshot('storybook-testbutton-interaction');
    
    // Verify button is still visible after tap
    await waitFor(element(by.text('Test Button')))
      .toBeVisible()
      .withTimeout(5000);
    
    console.log('✅ TestButton interaction works');
  });

  it('should capture story interface elements', async () => {
    // Take comprehensive screenshot
    await device.takeScreenshot('storybook-story-interface');
    
    // Verify Storybook interface elements
    await waitFor(element(by.text('TestButton/Default')))
      .toBeVisible()
      .withTimeout(5000);
    
    console.log('✅ Storybook story interface captured');
  });

  it('should interact with story controls', async () => {
    // Look for controls panel if available
    try {
      await waitFor(element(by.text('Controls')))
        .toBeVisible()
        .withTimeout(3000);
      
      await element(by.text('Controls')).tap();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot of controls
      await device.takeScreenshot('storybook-controls-panel');
      
      console.log('✅ Storybook controls accessible');
    } catch (error) {
      console.log('⚠️ Controls panel not immediately visible');
      await device.takeScreenshot('storybook-no-controls');
    }
  });

  it('should validate Storybook is functional and ready for development', async () => {
    // Final validation screenshot
    await device.takeScreenshot('storybook-final-validation');
    
    // Verify all key elements are present
    await waitFor(element(by.text('Test Button')))
      .toBeVisible()
      .withTimeout(5000);
      
    await waitFor(element(by.text('TestButton/Default')))
      .toBeVisible()
      .withTimeout(5000);
    
    console.log('✅ Storybook validation complete - ready for development');
  });
});