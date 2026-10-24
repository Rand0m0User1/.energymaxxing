import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ARTIFACT=1 inlines fonts into the CSS so scripts/make-artifact.mjs can produce one self-contained HTML file.
const artifact = !!process.env.ARTIFACT;

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
  worker: { format: 'es' },
  build: {
    outDir: artifact ? 'dist-artifact/build' : 'dist',
    assetsInlineLimit: artifact ? 400_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
});
