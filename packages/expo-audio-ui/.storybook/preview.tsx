import type { Preview } from '@storybook/react';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
}

LoadSkiaWeb({
    locateFile: (path) => {
        const SkiaVersion = '0.39.1'
        const url = `./canvaskit-${SkiaVersion}.wasm`;
        console.log(`Loading Skia: ${url}`);
        return url;
    },
})
    .then(() => {
        console.log('Skia loaded successfully');
    })
    .catch((error) => {
        console.error('Failed to load Skia', error);
    });

export default preview
