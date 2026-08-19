import remdx from '@nkzw/vite-plugin-remdx';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative, so the same build works at the Vercel root and under the
  // GitHub Pages project sub-path (/slide-claude-code-lt/).
  base: './',
  plugins: [remdx(), react()],
});
