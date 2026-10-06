import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'safety-snapshot',title:'Safety snapshot',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('patientId'),s=await clinicalApi.snapshot(id);root.innerHTML=`${(s.alerts||[]).map(a=>`<div class="alert ${a.severity==='CRITICAL'?'danger':'warning'}"><strong>${escapeHtml(a.severity)} — ${escapeHtml(a.type)}</strong><p>${escapeHtml(a.message)}</p></div>`).join('')}<div class="three-columns"><article class="card"><h3>Alergias</h3>${(s.allergies||[]).map(a=>`<p>${escapeHtml(a.substance)} — ${escapeHtml(a.reaction||'')}</p>`).join('')||'<p>Nenhuma ativa.</p>'}</article><article class="card"><h3>Medicamentos</h3>${(s.medications||[]).map(m=>`<p>${escapeHtml(m.name)}</p>`).join('')||'<p>Nenhum ativo.</p>'}</article><article class="card"><h3>Condições</h3>${(s.conditions||[]).map(c=>`<p>${escapeHtml(c.description)}</p>`).join('')||'<p>Nenhuma ativa.</p>'}</article></div>`;
}catch(error){renderError(root,error);}}
