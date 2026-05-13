// Wrapper for Prisma CLI: builds DATABASE_URL from DB_* parts in .env, then
// spawns `prisma <args>`. This way you don't need a literal DATABASE_URL line
// in .env — the script constructs it on the fly.
//
// Usage:
//   node scripts/prisma.js migrate dev
//   node scripts/prisma.js generate
//   node scripts/prisma.js db seed
//   node scripts/prisma.js db push
//
// Or via npm:
//   npm run prisma -- migrate dev

const path = require('path');
const { spawnSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const user = process.env.DB_USERNAME;
const pass = process.env.DB_PASSWORD;
const db = process.env.DATABASE;

if (host && port && user && pass && db) {
  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(pass);
  process.env.DATABASE_URL = `postgresql://${encUser}:${encPass}@${host}:${port}/${db}?schema=public`;
  console.log(`[prisma-wrapper] DATABASE_URL = postgresql://${encUser}:***@${host}:${port}/${db}`);
} else if (process.env.DATABASE_URL) {
  console.log('[prisma-wrapper] using DATABASE_URL from .env');
} else {
  console.error('[prisma-wrapper] DB_* variables missing in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const isWin = process.platform === 'win32';
const cmd = isWin ? 'npx.cmd' : 'npx';
const result = spawnSync(cmd, ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 0);
