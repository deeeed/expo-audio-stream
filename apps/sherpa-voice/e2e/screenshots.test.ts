import { beforeAll, afterAll, describe, it } from '@jest/globals'
import { by, element, waitFor, device } from 'detox'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Android emulators on Apple Silicon have broken adb screencap (empty framebuffer).
// Use emulator console `screenrecord screenshot` as fallback.
async function takeScreenshot(name: string): Promise<string> {
  if (device.getPlatform() === 'android') {
    try {
      // Detect emulator serial
      const devices = execSync('adb devices').toString();
      const emulatorMatch = devices.match(/(emulator-\d+)/);
      if (emulatorMatch) {
        const serial = emulatorMatch[1];
        const port = serial.replace('emulator-', '');
        const token = fs.readFileSync(
          path.join(process.env.HOME || '', '.emulator_console_auth_token'),
          'utf-8'
        ).trim();

        const artifactsDir = process.env.DETOX_ARTIFACTS_LOCATION ||
          path.join(process.cwd(), 'screenshots', 'detox-artifacts');
        fs.mkdirSync(artifactsDir, { recursive: true });
        const outPath = path.join(artifactsDir, `${name}.png`);

        // Use emulator console screenshot
        execSync(
          `(echo "auth ${token}"; sleep 0.5; echo "screenrecord screenshot ${outPath}"; sleep 1; echo "quit") | nc localhost ${port}`,
          { timeout: 10000 }
        );

        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50000) {
          return outPath;
        }
      }
    } catch {
      // Fall through to default
    }
  }
  // Default: use Detox built-in (works on iOS and physical Android devices)
  await device.takeScreenshot(name);
  return name;
}

describe('Sherpa Voice Screenshots', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: { detoxDisableSynchronization: 1 },
    });
    await device.disableSynchronization();
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Send deep link to connect dev-client to Metro
    await device.openURL({
      url: 'exp+sherpa-voice-development://expo-development-client/?url=http%3A%2F%2Flocalhost%3A7500',
    });
    // Wait for JS bundle to load
    await new Promise(resolve => setTimeout(resolve, 10000));
    // Dismiss dev menu if visible
    try {
      await element(by.text('Continue')).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Dev menu not shown — continue
    }
  });

  afterAll(async () => {
    await device.enableSynchronization();
  });

  describe('Tab Screenshots', () => {
    it('should capture Features tab', async () => {
      await waitFor(element(by.text('Speech Recognition')))
        .toBeVisible()
        .withTimeout(10000);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await takeScreenshot('01-features');
    });

    it('should capture Models tab', async () => {
      await element(by.text('Models')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('02-models');
    });

    it('should capture About tab', async () => {
      await element(by.text('About')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await takeScreenshot('03-about');
    });
  });

  describe('Feature Detail Screenshots', () => {
    it('should capture ASR model catalog', async () => {
      await element(by.text('Features')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await waitFor(element(by.text('Speech Recognition')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Speech Recognition')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Tap "Download a Model" to open the model catalog bottom sheet
      await waitFor(element(by.text('Download a Model')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Download a Model')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('04-asr');
    });

    it('should capture TTS model catalog', async () => {
      // Force fresh launch to reset navigation state
      await device.terminateApp();
      await device.launchApp({ newInstance: true });
      await new Promise(resolve => setTimeout(resolve, 5000));

      await waitFor(element(by.text('Text-to-Speech')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.text('Text-to-Speech')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Tap "Download a Model" to open the TTS model catalog
      await waitFor(element(by.text('Download a Model')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.text('Download a Model')).atIndex(0).tap();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('05-tts');
    });
  });
});
