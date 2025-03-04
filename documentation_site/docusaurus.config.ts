import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Expo Audio Studio',
  tagline: 'Comprehensive audio studio library for React Native and Expo with recording, analysis, visualization, and streaming capabilities across iOS, Android, and web platforms.',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://deeeed.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/expo-audio-stream/docs',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'siteed', // Usually your GitHub org/user name.
  projectName: 'expo-audio-stream', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  trailingSlash: true,

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/icon-192x192.png',
    navbar: {
      title: 'Expo Audio Studio',
      logo: {
        alt: 'Expo Audio Studio Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar', // Make sure this matches the sidebar ID in sidebars.js
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/deeeed/expo-audio-stream',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  // plugins: [
  //   [
  //     '@docusaurus/plugin-client-redirects',
  //     {
  //       redirects: [
  //         {
  //           to: '/docs/introduction', // Adjust this to your specific docs landing page
  //           from: '/',
  //         },
  //       ],
  //     },
  //   ],
  // ],
};

export default config;
