export default {
  parameters: {
    // Enable interaction testing
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
}; 