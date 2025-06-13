import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../ui-components/**/*.stories.@(js|jsx|ts|tsx)',
    // Temporarily disabled UI library stories to debug displayName error
    // '../../../packages/expo-audio-ui/src/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-ondevice-controls',
    // '@storybook/addon-ondevice-actions', // Disabled due to import error with storybook v9
  ],
};

export default main;