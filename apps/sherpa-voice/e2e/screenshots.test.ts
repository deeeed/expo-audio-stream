import { beforeAll, afterAll, describe, it } from '@jest/globals'
import { by, element, waitFor, device } from 'detox'

// NativeTabs renders native tab bar items — use by.label() on iOS, by.text() on Android
function tabElement(label: string) {
  if (device.getPlatform() === 'ios') {
    return element(by.label(label)).atIndex(0);
  }
  return element(by.text(label)).atIndex(0);
}

describe('Sherpa Voice Screenshots', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Give the app time to fully render before checking
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    await device.enableSynchronization();
  });

  describe('Tab Screenshots', () => {
    it('should capture Home tab', async () => {
      // Already on Home tab from launch
      await new Promise(resolve => setTimeout(resolve, 1500));
      await device.takeScreenshot('home-tab');
    });

    it('should capture Features tab', async () => {
      await tabElement('Features').tap();
      await waitFor(element(by.text('Speech Recognition')))
        .toBeVisible()
        .withTimeout(5000);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await device.takeScreenshot('features-tab');
    });

    it('should capture Models tab', async () => {
      await tabElement('Models').tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await device.takeScreenshot('models-tab');
    });

    it('should capture About tab', async () => {
      await tabElement('About').tap();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await device.takeScreenshot('about-tab');
    });
  });

  describe('Feature Detail Screenshots', () => {
    it('should capture ASR feature', async () => {
      await tabElement('Features').tap();
      await waitFor(element(by.text('Speech Recognition')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Speech Recognition')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await device.takeScreenshot('feature-asr');

      // Go back
      if (device.getPlatform() === 'ios') {
        await element(by.traits(['button'])).atIndex(0).tap();
      } else {
        await device.pressBack();
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should capture TTS feature', async () => {
      await waitFor(element(by.text('Text-to-Speech')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Text-to-Speech')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await device.takeScreenshot('feature-tts');

      if (device.getPlatform() === 'ios') {
        await element(by.traits(['button'])).atIndex(0).tap();
      } else {
        await device.pressBack();
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });
});
