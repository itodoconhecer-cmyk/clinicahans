import { session } from '../state/session.js';
import { escapeHtml } from '../utils/html.js';
import { ApiError } from '../services/api.js';
import { showToast, errorCard } from '../components/ui.js';

const screens = [
  {key:'visao-geral', label:'Visão geral', roles:['RECEPCAO','MEDICO','GESTAO','ADMIN']},
  {key:'agenda', label:'Agenda', roles:['RECEPCAO','MEDICO','ADMIN']},
  {key:'fila-espera', label:'Fila de espera', roles:['RECEPCAO','ADMIN']},
  {key:'pacientes', label:'Pacientes', roles:['RECEPCAO','MEDICO','ADMIN']},
  {key:'medicos', label:'Médicos', roles:['RECEPCAO','MEDICO','GESTAO','ADMIN']},
  {key:'especialidades', label:'Especialidades', roles:['GESTAO','ADMIN']},
  {key:'prontuario', label:'Prontuário', roles:['MEDICO']},
  {key:'atendimento', label:'Atendimento', roles:['MEDICO']},
  {key:'exames', label:'Exames', roles:['MEDICO']},
  {key:'retornos', label:'Retornos', roles:['RECEPCAO','MEDICO','ADMIN']},
  {key:'faturamento', label:'Faturamento', roles:['RECEPCAO','GESTAO','ADMIN']},
  {key:'indicadores', label:'Indicadores', roles:['GESTAO','ADMIN']},
  {key:'usuarios', label:'Usuários', roles:['ADMIN']},
  {key:'auditoria', label:'Auditoria', roles:['ADMIN']}
];

export function hasAnyRole(roles){
  return roles.some(role=>session.hasRole(role));
}

export function requireSession(roles=[]){
  const current=session.get();
  if(!current){
    window.location.replace('../login/login.html');
    return false;
  }
  if(roles.length && !hasAnyRole(roles)){
    window.location.replace('../visao-geral/visao-geral.html');
    return false;
  }
  return true;
}

export function mountScreen({key,title,roles=[]}){
  if(!requireSession(roles)) return null;
  document.title=`${title} | Clínica Hans`;
  const current=session.get();
  const nav=document.getElementById('sidebar-nav');
  if(nav){
    nav.innerHTML=screens
      .filter(item=>hasAnyRole(item.roles))
      .map(item=>`<a class="nav-link ${item.key===key?'active':''}" href="../${item.key}/${item.key}.html">${escapeHtml(item.label)}</a>`)
      .join('');
  }
  const titleEl=document.getElementById('screen-title'); if(titleEl) titleEl.textContent=title;
  const userEl=document.getElementById('session-user'); if(userEl) userEl.textContent=current?.username||'usuário';
  const rolesEl=document.getElementById('session-roles'); if(rolesEl) rolesEl.textContent=(current?.roles||[]).join(' · ');
  document.getElementById('logout')?.addEventListener('click',()=>{
    session.clear();
    window.location.replace('../login/login.html');
  });
  return document.getElementById('screen-root');
}

export function renderError(target,error){
  const e=error instanceof ApiError?error:new ApiError(error?.message||'Erro inesperado.');
  target.innerHTML=errorCard(e.message,e.correlationId);
}

export function toneForStatus(status=''){
  const value=String(status).toUpperCase();
  if(['COMPLETED','PAID','REVIEWED','ACTIVE','CLOSED','RESOLVED','CONFIRMED'].includes(value)) return 'success';
  if(['CANCELLED','NO_SHOW','CRITICAL','OVERDUE','INACTIVE'].includes(value)) return 'danger';
  return 'warning';
}

export function localDayRange(){
  const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0);
  const end=new Date(start); end.setDate(end.getDate()+1);
  return [start.toISOString(),end.toISOString()];
}

export function monthRange(){
  const now=new Date();
  const from=new Date(now.getFullYear(),now.getMonth(),1);
  const to=new Date(now.getFullYear(),now.getMonth()+1,0);
  const iso=d=>d.toISOString().slice(0,10);
  return [iso(from),iso(to)];
}

export function queryParam(name){ return new URLSearchParams(window.location.search).get(name); }

export function openModal(title,content,onReady){
  closeModal();
  const el=document.createElement('div');
  el.className='modal'; el.id='active-modal'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  el.innerHTML=`<div class="modal-card"><div class="panel-header"><h2>${escapeHtml(title)}</h2><button class="ghost-button" id="modal-close">Fechar</button></div>${content}</div>`;
  document.body.appendChild(el);
  const close=()=>closeModal();
  el.querySelector('#modal-close')?.addEventListener('click',close);
  el.addEventListener('click',event=>{if(event.target===el)close();});
  document.addEventListener('keydown',function esc(event){if(event.key==='Escape'){document.removeEventListener('keydown',esc);close();}});
  onReady?.(el);
}

export function closeModal(){document.getElementById('active-modal')?.remove();}

export { showToast };
