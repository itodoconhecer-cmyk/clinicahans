import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const frontend = path.join(root, 'frontend');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(frontend);
const relative = f => path.relative(root, f).replaceAll('\\', '/');

const forbiddenFiles = files.filter(f => /\.(jsx|tsx|ts)$/.test(f) || path.basename(f) === 'package.json');
if (forbiddenFiles.length) {
  throw new Error('Arquivos incompatíveis com frontend vanilla: ' + forbiddenFiles.map(relative).join(', '));
}

const forbiddenTerms = /\b(react|react-dom|vite|vue|angular|svelte|typescript)\b/i;
for (const file of files.filter(f => /\.(js|mjs|html)$/.test(f))) {
  const content = fs.readFileSync(file, 'utf8');
  if (forbiddenTerms.test(content)) {
    throw new Error('Framework/bundler detectado em ' + relative(file));
  }
}

for (const file of files.filter(f => /\.(js|mjs)$/.test(f))) {
  if (relative(file) === 'frontend/services/api.js' || relative(file) === 'frontend/verify-architecture.mjs') continue;
  const content = fs.readFileSync(file, 'utf8');
  if (/\bfetch\s*\(/.test(content)) {
    throw new Error('fetch direto fora da camada services: ' + relative(file));
  }
}

const api = fs.readFileSync(path.join(frontend, 'services/api.js'), 'utf8');
const endpoints = [
  '/api/v1/auth/login',
  '/api/v1/patients',
  '/api/v1/doctors',
  '/api/v1/appointments',
  '/api/v1/waitlist',
  '/api/v1/clinical',
  '/api/v1/continuity',
  '/api/v1/finance',
  '/api/v1/management',
  '/api/v1/admin/users',
  '/api/v1/audit'
];
for (const endpoint of endpoints) {
  if (!api.includes(endpoint)) throw new Error('Endpoint backend sem cliente frontend: ' + endpoint);
}

const index = fs.readFileSync(path.join(frontend, 'index.html'), 'utf8');
if (!/<script\s+type=["']module["']\s+src=["']\.\/app\.js["']/.test(index)) {
  throw new Error('index.html deve carregar app.js como ES Module nativo.');
}

console.log('Frontend vanilla verificado: sem framework, sem build e HTTP centralizado em services/api.js.');
