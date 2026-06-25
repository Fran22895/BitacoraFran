import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-transition-group/TransitionGroupContext': 'react-transition-group/esm/TransitionGroupContext.js',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: ['@mui/material', '@mui/icons-material', 'react-transition-group'],
        },
      },
    },
    server: {
      deps: {
        inline: [/^@mui\//, /^react-transition-group/],
      },
    },
  },
})
