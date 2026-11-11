import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // Shown in the page header, so the version only needs changing in package.json.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    // During `npm run dev`, send API calls to a locally running `node server.mjs`.
    proxy: { '/api': 'http://127.0.0.1:8080', '/health': 'http://127.0.0.1:8080' }
  }
});
