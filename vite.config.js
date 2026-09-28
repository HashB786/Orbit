import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    base: '/',
    plugins: [react()],
    build: {
        // Firebase's Firestore chunk is ~660 kB but only loads when Firebase is configured and used
        chunkSizeWarningLimit: 700
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
