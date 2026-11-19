import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

async function copyEntry(name: string): Promise<void> {
  await cp(join(scriptDir, name), join(outDir, name), { recursive: true });
}

await mkdir(outDir, { recursive: true });
await copyEntry('app');
await mkdir(join(outDir, 'screenshots'), { recursive: true });
await copyEntry('screenshots');
await writeFile(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
