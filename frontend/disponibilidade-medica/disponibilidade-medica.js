import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'disponibilidade-medica',title:'Disponibilidade médica',roles:["GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const id=queryParam('id');const load=async()=>{const rows=await doctorApi.availability(id);root.innerHTML=`<form id="form" class="panel form-grid two"><label>Dia (1-7)<input name="weekday" type="number" min="1" max="7" required></label><label>Início<input name="startsAt" type="time" required></label><label>Fim<input name="endsAt" type="time" required></label><label>Slot<input name="slotMinutes" type="number" value="30"></label><button class="primary-button">Adicionar</button></form>`+(rows.length?`<div class="table-wrap"><table><tbody>${rows.map(x=>`<tr><td>${x.weekday}</td><td>${escapeHtml(x.startsAt)}–${escapeHtml(x.endsAt)}</td><td>${x.slotMinutes} min</td></tr>`).join('')}</tbody></table></div>`:empty());root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.weekday=Number(b.weekday);b.slotMinutes=Number(b.slotMinutes);try{await doctorApi.addAvailability(id,b);await load();}catch(error){renderError(root,error);}});};await load();
  }catch(error){renderError(root,error);}
}
