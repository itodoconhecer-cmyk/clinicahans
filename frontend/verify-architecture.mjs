import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root=process.cwd();
const frontend=path.join(root,'frontend');
const screens=[
  "login",
  "visao-geral",
  "agenda",
  "novo-agendamento",
  "fila-espera",
  "converter-fila",
  "pacientes",
  "cadastro-paciente",
  "ficha-paciente",
  "editar-paciente",
  "medicos",
  "cadastro-medico",
  "detalhe-medico",
  "especialidades",
  "disponibilidade-medica",
  "bloqueios-agenda",
  "vinculo-usuario-medico",
  "prontuario",
  "safety-snapshot",
  "linha-tempo",
  "alergias-alertas",
  "medicamentos",
  "condicoes-clinicas",
  "documentos-clinicos",
  "atendimento",
  "salvar-rascunho",
  "finalizar-atendimento",
  "adendo",
  "solicitar-exame",
  "criar-followup",
  "exames",
  "novo-exame",
  "receber-resultado",
  "revisar-resultado",
  "retornos",
  "novo-acompanhamento",
  "registrar-acao",
  "faturamento",
  "novo-recebivel",
  "registrar-pagamento",
  "indicadores",
  "relatorios",
  "usuarios",
  "criar-usuario",
  "desativar-usuario",
  "auditoria",
  "pesquisa-auditoria",
  "detalhe-auditoria",
  "logs-publicos"
];
const sharedFolders=new Set(['services','state','components','utils','shared','vendor']);
// Bibliotecas autorizadas são verificadas por hash; regras de código próprio seguem integrais.
const vendorHashes=new Map([
  ['frontend/vendor/highcharts/highcharts.js','d8eff087665964775f068b2ebc7d54f23458e7a4dc18c519697365b1800f5732'],
  ['frontend/vendor/highcharts/accessibility.js','951eb02055cfc9e61db04eabba6cdfe258c8eb80998209640dea30c0613f7c87']
]);

function fail(message){throw new Error(message);}
function read(file){return fs.readFileSync(file,'utf8');}
function exists(file){return fs.existsSync(file);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const relative=f=>path.relative(root,f).replaceAll('\\','/');

if(exists(path.join(frontend,'app.js'))) fail('frontend/app.js antigo não pode existir: cada tela deve possuir JS próprio.');
if(exists(path.join(frontend,'styles.css'))) fail('frontend/styles.css antigo não pode existir: use shared/global.css + CSS por tela.');

for(const screen of screens){
  const dir=path.join(frontend,screen);
  const html=path.join(dir,screen+'.html');
  const css=path.join(dir,screen+'.css');
  const js=path.join(dir,screen+'.js');
  if(!exists(dir)) fail('Pasta da tela ausente: '+screen);
  if(!exists(html)||!exists(css)||!exists(js)) fail('Tela '+screen+' deve possuir '+screen+'.html, '+screen+'.css e '+screen+'.js');
  const htmlContent=read(html);
  if(!htmlContent.includes('./'+screen+'.css')) fail('HTML de '+screen+' não referencia seu CSS próprio.');
  if(!htmlContent.includes('./'+screen+'.js')) fail('HTML de '+screen+' não referencia seu JavaScript próprio.');
  const cssContent=read(css);
  if(!cssContent.includes("../shared/global.css")) fail('CSS de '+screen+' deve importar o CSS geral compartilhado.');
}

const files=walk(frontend);
for(const [file,hash] of vendorHashes){
  const absolute=path.join(root,file);
  if(!exists(absolute)||createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')!==hash) fail('Biblioteca ausente ou modificada: '+file);
}
for(const file of files.filter(f=>relative(f).startsWith('frontend/vendor/'))){
  if(/\.(js|mjs|html|css)$/.test(file)&&!vendorHashes.has(relative(file))) fail('Biblioteca sem aprovação no inventário: '+relative(file));
}
const forbiddenFiles=files.filter(f=>/\.(jsx|tsx|ts)$/.test(f)||path.basename(f)==='package.json');
if(forbiddenFiles.length) fail('Arquivos incompatíveis com frontend vanilla: '+forbiddenFiles.map(relative).join(', '));

const forbiddenTerms=/\b(react|react-dom|vite|vue|angular|svelte|typescript)\b/i;
for(const file of files.filter(f=>/\.(js|mjs|html)$/.test(f))){
  if(relative(file)==='frontend/verify-architecture.mjs') continue;
  if(vendorHashes.has(relative(file))) continue;
  if(forbiddenTerms.test(read(file))) fail('Framework/bundler detectado em '+relative(file));
}

for(const file of files.filter(f=>/\.(js|mjs)$/.test(f))){
  const rel=relative(file);
  if(rel==='frontend/services/api.js'||rel==='frontend/verify-architecture.mjs') continue;
  if(vendorHashes.has(rel)) continue;
  if(/\bfetch\s*\(/.test(read(file))) fail('fetch direto fora da camada services: '+rel);
}

for(const entry of fs.readdirSync(frontend,{withFileTypes:true}).filter(e=>e.isDirectory())){
  if(sharedFolders.has(entry.name)||screens.includes(entry.name)) continue;
  fail('Pasta frontend não classificada como tela ou infraestrutura compartilhada: '+entry.name);
}

const api=read(path.join(frontend,'services/api.js'));
for(const endpoint of ['/api/v1/auth/login','/api/v1/patients','/api/v1/doctors','/api/v1/appointments','/api/v1/waitlist','/api/v1/clinical','/api/v1/continuity','/api/v1/finance','/api/v1/management','/api/v1/admin/users','/api/v1/audit']){
  if(!api.includes(endpoint)) fail('Grupo de endpoint sem cliente frontend: '+endpoint);
}

console.log('Arquitetura validada: '+screens.length+' telas, cada uma com HTML/CSS/JS próprios, sem SPA/framework e com HTTP centralizado.');
