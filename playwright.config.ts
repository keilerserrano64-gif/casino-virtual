import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  webServer: { command: 'python3 -m http.server 5173', url: 'http://localhost:5173/index.html', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:5173' },
});
