import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'bloqueios-agenda',title:'Bloqueios de agenda',roles:["GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const id=queryParam('id'),from=new Date().toISOString(),to=new Date(Date.now()+90*86400000).toISOString();const load=async()=>{const rows=await doctorApi.blocks(id,from,to);root.innerHTML=`<form id="form" class="panel form-grid"><label>Início<input name="startsAt" type="datetime-local" required></label><label>Fim<input name="endsAt" type="datetime-local" required></label><label>Motivo<input name="reason"></label><button class="primary-button">Bloquear</button></form>`+(rows.length?`<div class="table-wrap"><table><tbody>${rows.map(x=>`<tr><td>${formatDateTime(x.startsAt)}</td><td>${formatDateTime(x.endsAt)}</td><td>${escapeHtml(x.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:empty());root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.startsAt=new Date(b.startsAt).toISOString();b.endsAt=new Date(b.endsAt).toISOString();try{await doctorApi.addBlock(id,b);await load();}catch(error){renderError(root,error);}});};await load();
  }catch(error){renderError(root,error);}
}
