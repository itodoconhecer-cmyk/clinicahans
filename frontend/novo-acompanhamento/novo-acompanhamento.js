import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'novo-acompanhamento',title:'Novo acompanhamento',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Paciente<input name="patientId" required></label><label>Atendimento<input name="encounterId"></label><label>Motivo<textarea name="reason" required></textarea></label><label>Prioridade<select name="priority"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label>Prazo<input name="dueAt" type="datetime-local"></label><button class="primary-button">Criar</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.encounterId=b.encounterId||null;b.dueAt=b.dueAt?new Date(b.dueAt).toISOString():null;await continuityApi.createFollowUp(b);window.location.href='../retornos/retornos.html';});
}catch(error){renderError(root,error);}}
