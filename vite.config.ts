import { defineConfig } from 'vite'

// three.js 한 덩어리(약 570kB, gzip 150kB)라 경고 기준만 올린다
export default defineConfig({ build: { chunkSizeWarningLimit: 700 } })
