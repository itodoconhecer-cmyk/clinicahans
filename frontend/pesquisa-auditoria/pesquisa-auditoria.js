import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'pesquisa-auditoria',title:'Pesquisa de auditoria',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Tipo da entidade<input name="entityType"></label><label>ID da entidade<input name="entityId"></label><button class="primary-button">Pesquisar</button></form><div id="results"></div>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),rows=await adminApi.audit(f.get('entityType'),f.get('entityId'));root.querySelector('#results').innerHTML=rows.length?`<div class="table-wrap"><table><tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.occurredAt)}</td><td>${escapeHtml(r.action)}</td><td><code>${escapeHtml(r.correlationId||'—')}</code></td></tr>`).join('')}</tbody></table></div>`:empty();});
}catch(error){renderError(root,error);}}
