import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'auditoria',title:'Auditoria',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const rows=await adminApi.audit();root.innerHTML=`<div class="panel-header"><h2>Eventos recentes</h2><a class="secondary-button" href="../pesquisa-auditoria/pesquisa-auditoria.html">Pesquisa avançada</a></div><div class="table-wrap"><table><thead><tr><th>Quando</th><th>Quem</th><th>Origem</th><th>O que / onde</th><th>Correlation ID</th><th>Resultado</th><th>Contexto da requisição</th><th>Valores anteriores</th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td>${formatDateTime(r.occurredAt)}</td>
    <td>${escapeHtml(r.username||'não autenticado')}</td>
    <td>${escapeHtml(r.sourceIp||'—')}</td>
    <td><strong>${escapeHtml(r.action)}</strong><br><small>${escapeHtml(r.requestMethod||'—')} ${escapeHtml(r.requestPath||r.entityType)}${r.entityId?` · <a href="../detalhe-auditoria/detalhe-auditoria.html?entityType=${encodeURIComponent(r.entityType)}&entityId=${encodeURIComponent(r.entityId)}">${escapeHtml(r.entityId)}</a>`:''}</small></td>
    <td>${r.correlationId?`<a href="../pesquisa-auditoria/pesquisa-auditoria.html?correlationId=${encodeURIComponent(r.correlationId)}"><code>${escapeHtml(r.correlationId)}</code></a>`:'—'}</td>
    <td>${escapeHtml(r.outcome||'—')}${r.httpStatus?` (${escapeHtml(r.httpStatus)})`:''}</td>
    <td><pre>${escapeHtml(r.requestContext||'—')}</pre></td>
    <td><pre>${escapeHtml(r.previousValues||'—')}</pre></td>
  </tr>`).join('')}</tbody></table></div>`;
}catch(error){renderError(root,error);}}
