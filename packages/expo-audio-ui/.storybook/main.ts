import path, { join, dirname } from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration as WebpackConfig } from 'webpack';

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
    addons: [
        getAbsolutePath('@storybook/addon-webpack5-compiler-swc'),
        getAbsolutePath('@storybook/addon-interactions'),
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
