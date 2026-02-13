/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    // 'autoprefixer': {},      // (Optional: v4 handles this automatically mostly, but safe to keep)
  },
};

export default config;