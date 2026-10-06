import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'medicamentos',title:'Medicamentos',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('patientId');const load=async()=>{const s=await clinicalApi.snapshot(id);root.innerHTML=`<form id="form" class="panel form-grid"><label>Nome<input name="name" required></label><label>Dose<input name="dosage"></label><label>Frequência<input name="frequency"></label><label>Início<input name="startedOn" type="date"></label><button class="primary-button">Registrar medicamento</button></form>`+`<article class="panel"><h2>Ativos</h2>${(s.medications||[]).map(m=>`<p>${escapeHtml(m.name)} · ${escapeHtml(m.dosage||'')} · ${escapeHtml(m.frequency||'')}</p>`).join('')||'<p>Nenhum.</p>'}</article>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();await clinicalApi.addMedication(id,Object.fromEntries(new FormData(e.currentTarget).entries()));await load();});};await load();
}catch(error){renderError(root,error);}}
