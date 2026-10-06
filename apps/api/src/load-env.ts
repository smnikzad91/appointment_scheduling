import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Loads apps/api/.env into process.env before anything else is imported (main.ts imports this
// module first; ES modules run imports in order). It must win the race with the Prisma client:
// importing @prisma/client auto-loads packages/database/.env — the migrator's DATABASE_URL — and
// neither dotenv nor ConfigModule overrides a variable that's already set, so the API ran as
// salon_migrator (schema owner) instead of salon_api until 2026-10-06. Values already in the
// environment (pm2's ecosystem env) still win: loadEnvFile never overrides them.
const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
