import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'condicoes-clinicas',title:'Condições clínicas',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('patientId');const load=async()=>{const s=await clinicalApi.snapshot(id);root.innerHTML=`<form id="form" class="panel form-grid"><label>Descrição<input name="description" required></label><label>Status<select name="status"><option>ACTIVE</option><option>CONTROLLED</option><option>RESOLVED</option></select></label><label>Início<input name="onsetDate" type="date"></label><button class="primary-button">Registrar condição</button></form><article class="panel">${(s.conditions||[]).map(c=>`<p>${escapeHtml(c.description)} — ${escapeHtml(c.status)}</p>`).join('')||'<p>Nenhuma.</p>'}</article>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();await clinicalApi.addCondition(id,Object.fromEntries(new FormData(e.currentTarget).entries()));await load();});};await load();
}catch(error){renderError(root,error);}}
