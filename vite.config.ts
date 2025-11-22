import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 关键修正：从根目录指向 src 目录
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['three'],
  },
  build: {
    outDir: 'dist', // 保持 dist，适配 Vercel
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
});
