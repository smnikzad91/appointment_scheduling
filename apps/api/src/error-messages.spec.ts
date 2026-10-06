import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// apps/web shows every API error in Persian through BY_API_MESSAGE
// (apps/web/src/lib/api/errorMessages.ts); a message missing there reaches users as a generic
// «خطایی رخ داد». This fails when an exception thrown in apps/api/src has no Persian line.

const SRC = join(__dirname);
const WEB_MESSAGES = join(__dirname, '../../web/src/lib/api/errorMessages.ts');

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsFiles(join(dir, e.name)) : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [join(dir, e.name)] : [],
  );
}

describe('API error messages', () => {
  it('every English message thrown in apps/api/src has a Persian entry in BY_API_MESSAGE', () => {
    const web = readFileSync(WEB_MESSAGES, 'utf8');
    const table = web.slice(web.indexOf('const BY_API_MESSAGE'), web.indexOf('\n};', web.indexOf('const BY_API_MESSAGE')));
    const translated = new Set([...table.matchAll(/^\s*"((?:[^"\\]|\\.)*)":/gm)].map((m) => m[1]));

    const missing: string[] = [];
    for (const file of tsFiles(SRC)) {
      // `new SomethingException("literal"` — the messages a user can see.
      for (const m of readFileSync(file, 'utf8').matchAll(/new \w+Exception\(\s*(?:"([^"]+)"|'([^']+)')/g)) {
        const message = m[1] ?? m[2];
        if (!translated.has(message)) missing.push(`${relative(SRC, file)}: "${message}"`);
      }
    }
    expect(translated.size).toBeGreaterThan(50); // the table was found and parsed
    expect(missing).toEqual([]);
  });
});
