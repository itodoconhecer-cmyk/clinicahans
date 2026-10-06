import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'solicitar-exame',title:'Solicitar exame',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Atendimento<input name="encounterId" value="${escapeHtml(queryParam('encounterId')||'')}" required></label><label>Exame<input name="examName" required></label><label>Prioridade<select name="priority"><option>ROUTINE</option><option>HIGH</option><option>URGENT</option></select></label><label>Prazo<input name="expectedBy" type="date"></label><button class="primary-button">Solicitar</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.expectedBy=b.expectedBy||null;await continuityApi.createExam(b);showToast('Exame solicitado.','success');window.location.href='../exames/exames.html';});
}catch(error){renderError(root,error);}}
