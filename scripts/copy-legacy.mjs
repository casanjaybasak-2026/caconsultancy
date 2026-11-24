// Post-build: copy the compiled legacy React app (tools + admin) into dist/.
import { cpSync, existsSync } from 'node:fs';
if (!existsSync('dist')) throw new Error('dist/ missing: run astro build first');
cpSync('legacy/app.html', 'dist/app.html');
cpSync('legacy/assets', 'dist/assets', { recursive: true });
console.log('legacy app copied into dist/');
