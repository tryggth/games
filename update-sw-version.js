import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SW_PATH = path.join(__dirname, 'public', 'sw.js');
const VERSION_PATH = path.join(__dirname, 'public', 'version.json');

const version = process.env.VITE_APP_VERSION || `v1.0.${Date.now()}`;
const buildVersion = `rummikub-pwa-${version}`;

if (fs.existsSync(SW_PATH)) {
  let content = fs.readFileSync(SW_PATH, 'utf-8');
  content = content.replace(/const CACHE_NAME = '.*?';/, `const CACHE_NAME = '${buildVersion}';`);
  fs.writeFileSync(SW_PATH, content, 'utf-8');
  console.log(`[PWA Build] Invalidation cache key updated -> ${buildVersion}`);
}

// Write version.json for HTTP-based real-time update polling
fs.writeFileSync(
  VERSION_PATH,
  JSON.stringify({ version, buildVersion, timestamp: Date.now() }, null, 2),
  'utf-8'
);
console.log(`[PWA Build] version.json generated -> ${version}`);
