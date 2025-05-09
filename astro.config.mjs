import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  compressHTML: true, // Enables HTML minification
  build: {
    inlineStylesheets: 'auto' // Helps reduce render-blocking CSS
  },
  vite: {
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
  }
});
