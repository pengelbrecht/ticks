import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  base: './',  // Relative paths so a path-prefixing proxy works
  server: {
    proxy: {
      // Proxy API requests to testrig or local Go server
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:18787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../server/static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@shoelace-style/shoelace/dist/assets/icons/*',
          dest: 'shoelace/assets/icons',
        },
      ],
    }),
  ],
});
