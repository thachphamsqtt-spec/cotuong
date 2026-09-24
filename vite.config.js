import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import process from 'node:process';
export default defineConfig({
    base: process.env.GITHUB_ACTIONS ? '/cotuong/' : '/',
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
            manifest: {
                name: 'Kỳ Đạo - Học, Luyện & Đấu Cờ Tướng',
                short_name: 'Kỳ Đạo',
                description: 'Nền tảng cờ tướng toàn diện: học cờ, luyện thế cờ, đấu với máy 8 cấp độ, xếp cờ và phân tích ván đấu.',
                theme_color: '#12100e',
                background_color: '#12100e',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'icon-192.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                    },
                    {
                        src: 'icon-512.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    test: {
        environment: 'node',
    },
});
