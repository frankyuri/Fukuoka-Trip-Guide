import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/Fukuoka-Trip-Guide/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Inject Google Places API Key into index.html
        {
          name: 'inject-google-api-key',
          transformIndexHtml(html) {
            return html.replace(
              'GOOGLE_PLACES_API_KEY_PLACEHOLDER',
              env.GOOGLE_PLACES_API_KEY || ''
            );
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GOOGLE_PLACES_API_KEY': JSON.stringify(env.GOOGLE_PLACES_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        rollupOptions: {
          output: {
            manualChunks: {
              // Core React libraries
              'vendor-react': ['react', 'react-dom'],
              // Map library (largest dependency)
              'vendor-leaflet': ['leaflet'],
              // Icons library
              'vendor-icons': ['lucide-react'],
            }
          }
        }
      }
    };
});
