/**
 * Planiloja Achadinhos - Hostinger Startup File
 * Automatically launches the compiled server (dist/server.cjs) or initializes TSX server in dev/standalone mode.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  console.log('[Hostinger Boot] dist/server.cjs não encontrado. Iniciando via TSX...');
  import('tsx').then(() => {
    import('./server.ts');
  }).catch((err) => {
    console.error('[Hostinger Boot Error] Execute npm run build antes de iniciar o servidor.', err);
  });
}
