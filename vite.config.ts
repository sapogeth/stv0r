import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  base: '/stv0r/',
  server: {
    proxy: {
      '/sui-api': {
        target: 'https://fullnode.testnet.sui.io/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sui-api/, ''),
      },
    },
  },
  optimizeDeps: {
    // Добавьте проблемную зависимость сюда
    exclude: ['sui-client'], 
  },
});