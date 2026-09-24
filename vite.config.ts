import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/cotuong/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
