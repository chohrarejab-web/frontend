import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:4000';

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    build: {
      sourcemap: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/ },
              { name: 'vendor-leaflet', test: /node_modules[\\/]leaflet[\\/]/ },
              { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
              { name: 'vendor-socket', test: /node_modules[\\/](socket\.io-client|engine\.io-client)[\\/]/ }
            ]
          }
        }
      }
    },
    server: {
      host: true,
      port: 5173,
      open: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});
