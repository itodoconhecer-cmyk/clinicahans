import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'auditoria',title:'Auditoria',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const rows=await adminApi.audit();root.innerHTML=`<div class="panel-header"><h2>Eventos recentes</h2><a class="secondary-button" href="../pesquisa-auditoria/pesquisa-auditoria.html">Pesquisa avançada</a></div><div class="table-wrap"><table><tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.occurredAt)}</td><td>${escapeHtml(r.username||'sistema')}</td><td>${escapeHtml(r.action)}</td><td><a href="../detalhe-auditoria/detalhe-auditoria.html?entityType=${encodeURIComponent(r.entityType)}&entityId=${encodeURIComponent(r.entityId||'')}">${escapeHtml(r.entityType)}</a></td></tr>`).join('')}</tbody></table></div>`;
}catch(error){renderError(root,error);}}
