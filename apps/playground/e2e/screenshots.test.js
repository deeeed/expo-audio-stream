describe('App Screenshots', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Wait for app to fully load
    await waitFor(element(by.id('record-screen-notice')))
      .toBeVisible()
      .withTimeout(10000);
  });

  beforeEach(async () => {
    // Don't reload for each test to avoid loading delays
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
        // Navigate to the tab
        await element(by.text(tab.name)).tap();
        
        // Wait for the tab content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Take a screenshot
        await device.takeScreenshot(`${tab.tabId}-tab`);
      });
    });
  });

  it('should capture Record screen with scrolled content', async () => {
    // Navigate to Record tab if not already there
    await element(by.text('Record')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // First verify the record screen notice is visible
    await expect(element(by.id('record-screen-notice'))).toBeVisible();
    
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
    await expect(element(by.id('start-recording-button'))).toBeVisible();
    await device.takeScreenshot('record-tab-with-button');
  });
}); 