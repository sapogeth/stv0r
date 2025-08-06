import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  base: '/stv0r/', // Эта строка нужна для деплоя на GitHub Pages
  server: {
    proxy: {
      '/sui-api': {
        target: 'https://fullnode.testnet.sui.io/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-api/, ''),
      },
    },
  },
});