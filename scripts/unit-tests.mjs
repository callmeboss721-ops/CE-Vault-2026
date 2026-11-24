#!/usr/bin/env node
// scripts/unit-tests.mjs — Unit & contract tests for CE-Vault monorepo
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const requiredFiles = [
  '.replit',
  'REPLIT_SETUP.md',
  'vercel.json',
  '.env.example',
  'DEPLOY_VERCEL.md',
  'api/[...path].ts',
  'cleanup.sh',
  'history-cleanup.sh',
  '.gitignore',
  'CLEANUP_REPORT.md',
  'install.sh',
  'artifacts/ce-vault/src/index.css',
  'artifacts/ce-vault/src/components/ui/CeIcon.tsx',
  'artifacts/ce-vault/src/components/ui/StatusBadge.tsx',
  'artifacts/ce-vault/src/components/ui/KpiCard.tsx',
  'artifacts/ce-vault/src/components/ui/CeButton.tsx',
  'artifacts/ce-vault/src/components/ui/TxItem.tsx',
  'artifacts/ce-vault/src/components/ui/index.ts',
  'artifacts/ce-vault/src/constants/messages.ts',
  'artifacts/api-server/src/server.mjs',
];

for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full), `Missing required file: ${rel}`);
}

const css = fs.readFileSync(path.join(ROOT, 'artifacts/ce-vault/src/index.css'), 'utf8');
assert.ok(css.includes('--c: #3fe0ff;'), 'index.css must contain patched cyan token');
assert.ok(css.includes('--g: #d4af37;'), 'index.css must contain patched gold token');

const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
assert.equal(vercelJson.outputDirectory, 'artifacts/ce-vault/dist/public');

console.log(`✅ [unit-tests] All ${requiredFiles.length} CE-Vault files, design tokens, and contracts verified!`);
