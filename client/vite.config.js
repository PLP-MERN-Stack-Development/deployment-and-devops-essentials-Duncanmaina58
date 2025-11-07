import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { splitVendorChunkPlugin } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      splitVendorChunkPlugin()
    ],
    
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://chatapp-ktbk.onrender.com',
          changeOrigin: true,
          secure: true,
        },
      },
    },

    build: {
      // Generate source maps for production builds
      sourcemap: true,
      
      // Enable chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Optimize deps
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'socket-vendor': ['socket.io-client'],
          },
        },
      },
      
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },

    // Enable Preview
    preview: {
      port: 4173,
      host: true,
    },
  }
})
