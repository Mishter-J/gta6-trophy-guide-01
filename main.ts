import { buildDossier } from "./vendor/makefun-frontend.ts";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

async function copyEntry(outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await rm(join(outDir, "app"), { recursive: true, force: true });
  await rm(join(outDir, "screenshots"), { recursive: true, force: true });
  await cp("app", join(outDir, "app"), { recursive: true });
  await cp("screenshots", join(outDir, "screenshots"), { recursive: true });
}

async function main(): Promise<void> {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  await copyEntry(outDir);
  const dossier = buildDossier(outDir, CAPS);
  await writeFile(join(outDir, "dossier.json"), dossier);
}

await main();
