import '@expo/metro-runtime'
import { registerRootComponent } from 'expo'

const STORYBOOK_MODE = process.env.EXPO_PUBLIC_STORYBOOK === 'true';

if (STORYBOOK_MODE) {
  /* eslint-disable @typescript-eslint/no-require-imports */
  // Dynamic import to prevent Metro from bundling when not needed
  const StorybookUIRoot = eval('require')('../.rnstorybook/index').default;
  registerRootComponent(StorybookUIRoot);
} else {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { AppRoot } = require('./AppRoot');
  registerRootComponent(AppRoot);
}
