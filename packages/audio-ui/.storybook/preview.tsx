import type { Preview } from '@storybook/react-webpack5';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import React from 'react';

// Load Skia globally before any stories render
let skiaLoaded = false;
const skiaPromise = LoadSkiaWeb({
    locateFile: (path) => {
        const SkiaVersion = '0.40.0'
        const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${SkiaVersion}/bin/full/${path}`;
        console.log(`Loading Skia: ${url}`);
        return url;
    },
})
    .then(() => {
        console.log('Skia loaded successfully');
        skiaLoaded = true;
    })
    .catch((error) => {
        console.error('Failed to load Skia', error);
    });

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    loaders: [
        async () => {
            // Ensure Skia is loaded before rendering any story
            if (!skiaLoaded) {
                await skiaPromise;
            }
            return {};
        },
    ],
}

export default preview
