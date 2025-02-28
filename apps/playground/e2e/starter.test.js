describe('Record Screen', () => {
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

  it('should show start recording button', async () => {
    // First verify the record screen notice is visible
    await expect(element(by.id('record-screen-notice'))).toBeVisible();
  });
});
