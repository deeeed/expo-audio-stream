import path, { join, dirname } from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration as WebpackConfig } from 'webpack';

const production = process.env.NODE_ENV === 'production';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
    return dirname(require.resolve(join(value, 'package.json')))
}

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config: StorybookConfig = {
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    staticDirs: ['../assets/'],
    managerHead: (head) => `
        ${head}
        ${production ? '<base href="/expo-audio-stream/expo-audio-ui-storybook/" />' : ''}
    `,
    addons: [
        getAbsolutePath('@storybook/addon-webpack5-compiler-swc'),
        getAbsolutePath('@storybook/addon-controls'),
        getAbsolutePath('@storybook/addon-links'),
        getAbsolutePath('@storybook/addon-measure'),
        getAbsolutePath('@storybook/addon-outline'),
        getAbsolutePath('@storybook/addon-backgrounds'),
        getAbsolutePath('@storybook/addon-toolbars'),
        // getAbsolutePath('@storybook/addon-interactions'),
        // getAbsolutePath('@storybook/addon-actions'),
        {
            name: '@storybook/addon-react-native-web',
            options: {
                modulesToTranspile: ['react-native-reanimated', '@gorhom/bottom-sheet'],
                babelPlugins: [
                '@babel/plugin-proposal-export-namespace-from',
                'react-native-reanimated/plugin',
                ],
            },
        }
    ],
    framework: {
        name: getAbsolutePath('@storybook/react-webpack5'),
        options: {},
    },
}
export default config
