import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    // By default, Docusaurus generates a sidebar from the docs folder structure
    // tutorialSidebar: [{type: 'autogenerated', dirName: '.'}],

    // But you can create a sidebar manually
    tutorialSidebar: [
      'index',
      'features',
      'installation',
        {
            type: 'category',
            label: 'Usage',
            items: ['usage/standalone-recording', 'usage/shared-recording'],
        },
        {
          type: 'category',
            label: 'Hooks',
            items: [
                'hooks/use-audio-recorder',
            ],
        },
        {
            type: 'category',
            label: 'API Reference',
            items: [
                'api-reference/api-intro',
                'api-reference/recording-config',
                'api-reference/audio-recording',
                'api-reference/audio-data-event',
                {
                    type: 'category',
                    label: 'Audio Features',
                    items: [
                        'api-reference/audio-features/audio-analysis',
                        'api-reference/audio-features/extract-audio-analysis',
                    ],
                },
                {
                    type: 'category',
                    label: 'Full Documentation',
                    items: [
                        'api-reference/API/README',
                    ],
                },
            ],
        },
        {
            type: 'doc',
            id: 'playground',
            label: 'Playground Application',
        },
    ],
}

export default sidebars
