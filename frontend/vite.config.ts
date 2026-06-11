import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // BUG-2: 코드 스플리팅 — 큰 라이브러리/vendor를 별도 청크로 분리하여
  // 초기 번들 크기 감소 및 캐시 효율 향상.
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 핵심 (라우터 + DOM)
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // Radix UI 프리미티브 (26개) — 거의 모든 페이지에서 사용
          'radix-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // 차트/시각화 (recharts + framer-motion 후속 motion)
          'chart-vendor': ['recharts', 'motion'],
        },
      },
    },
    // 500KB 경고 임계값 유지 (코어 청크는 분리되어 500KB 이하로 떨어질 것)
    chunkSizeWarningLimit: 500,
  },
})
