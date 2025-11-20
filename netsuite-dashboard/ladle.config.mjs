/** @type {import('@ladle/react').Config} */
const config = {
  stories: ['src/**/*.stories.@(ts|tsx|js|jsx)'],
  viteConfig: {
    define: {
      'process.env': {}
    }
  }
};

export default config;
