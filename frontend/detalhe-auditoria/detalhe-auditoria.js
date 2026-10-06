import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'detalhe-auditoria',title:'Detalhe de auditoria',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const type=queryParam('entityType'),id=queryParam('entityId'),rows=await adminApi.audit(type,id);root.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Correlation ID</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.occurredAt)}</td><td>${escapeHtml(r.username||'sistema')}</td><td>${escapeHtml(r.action)}</td><td><code>${escapeHtml(r.correlationId||'—')}</code></td></tr>`).join('')}</tbody></table></div>`:empty();
}catch(error){renderError(root,error);}}
