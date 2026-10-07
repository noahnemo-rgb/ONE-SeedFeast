import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';
import { createDeploymentConfig } from './vercel-output-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, '.vercel', 'output');
const staticDir = path.join(outputDir, 'static');
const functionDir = path.join(outputDir, 'functions', 'index.func');
const serverEntry = path.join(root, 'build', 'server', 'index.js');
const clientDir = path.join(root, 'build', 'client');

const serverStat = await stat(serverEntry).catch(() => null);
const clientStat = await stat(clientDir).catch(() => null);
if (!serverStat?.isFile() || !clientStat?.isDirectory()) {
  throw new Error('Run `react-router build` before assembling the Vercel output.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await cp(clientDir, staticDir, { recursive: true, dereference: true });

const traced = await nodeFileTrace([serverEntry], {
  base: root,
  processCwd: root,
});

for (const warning of traced.warnings) {
  console.warn(`nft: ${warning.message}`);
}

let copied = 0;
for (const file of traced.fileList) {
  const relativeFile = path.isAbsolute(file) ? path.relative(root, file) : file;
  if (!relativeFile || relativeFile.startsWith('..') || path.isAbsolute(relativeFile)) {
    continue;
  }
  const source = path.join(root, relativeFile);
  const destination = path.join(functionDir, relativeFile);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { dereference: true });
  copied += 1;
}

await mkdir(path.join(functionDir, 'build', 'client'), { recursive: true });
const listenMarker = 'if (PRODUCTION) {\n    const server = serve(';
const listenReplacement =
  'if (PRODUCTION && process.env.SEEDFEAST_VERCEL_FETCH !== "1") {\n    const server = serve(';
await disableProductionListen(path.join(functionDir, 'build', 'server'));

await writeFile(
  path.join(functionDir, 'package.json'),
  `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
);

await cp(
  path.join(root, 'server', 'vercel-handler.mjs'),
  path.join(functionDir, 'index.mjs'),
);

const vcConfig = {
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  shouldAddSourcemapSupport: true,
  supportsResponseStreaming: true,
};

await writeFile(
  path.join(functionDir, '.vc-config.json'),
  `${JSON.stringify(vcConfig, null, 2)}\n`,
);
await writeFile(
  path.join(outputDir, 'config.json'),
  `${JSON.stringify(createDeploymentConfig(), null, 2)}\n`,
);

console.log(
  `Vercel output: ${copied} server files in functions/index.func, static files from build/client.`,
);

async function disableProductionListen(serverDir) {
  const files = await collectJsFiles(serverDir);
  let patched = false;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.includes(listenMarker)) continue;
    await writeFile(file, source.replace(listenMarker, listenReplacement));
    patched = true;
  }
  if (!patched) {
    throw new Error(
      'Could not disable Hono listen() in the Vercel server bundle. The function must export fetch() without binding a port.',
    );
  }
}

async function collectJsFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectJsFiles(fullPath)));
    else if (entry.name.endsWith('.js')) files.push(fullPath);
  }
  return files;
}
