import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'linha-tempo',title:'Linha do tempo',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const rows=await clinicalApi.timeline(queryParam('patientId'));root.innerHTML=rows.length?`<div class="timeline">${rows.map(x=>`<div class="timeline-item"><strong>${escapeHtml(x.type)}</strong><p>${escapeHtml(x.title)}</p><small>${formatDateTime(x.occurredAt)}</small></div>`).join('')}</div>`:empty('Sem eventos clínicos.');
}catch(error){renderError(root,error);}}
