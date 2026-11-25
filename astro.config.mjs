import { defineConfig, fontProviders } from 'astro/config'
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
    inlineStylesheets: 'always' // Single-page site: inline all CSS so nothing blocks first render
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
  integrations: [sitemap()],
  // Self-hosted at build time (no third-party round trips, size-adjusted fallbacks to avoid CLS)
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600],
      subsets: ['latin'],
      fallbacks: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-cormorant',
      weights: [500, 600],
      subsets: ['latin'],
      fallbacks: ['Garamond', 'Times New Roman', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});