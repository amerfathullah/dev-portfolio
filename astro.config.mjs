import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: "https://www.amerfathullah.com",
  // Enables HTML minification
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto' // Helps reduce render-blocking CSS
  },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      minify: 'terser', // Use Terser for more aggressive minification
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.logs
          passes: 2 // Multiple optimization passes
        }
      }
    },
    plugins: [tailwindcss()],
  },
  integrations: [sitemap()]
});