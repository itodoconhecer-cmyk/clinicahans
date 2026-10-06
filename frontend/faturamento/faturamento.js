import { financeApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'faturamento',title:'Faturamento',roles:["RECEPCAO","GESTAO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const [from,to]=monthRange(),rows=await financeApi.list(from,to);root.innerHTML=`<div class="panel-header"><h2>Recebíveis</h2><a class="primary-button" href="../novo-recebivel/novo-recebivel.html">Novo recebível</a></div>`+(rows.length?`<div class="table-wrap"><table><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.encounterId)}</td><td>${formatMoney(r.amount)}</td><td>${badge(r.status,toneForStatus(r.status))}</td><td>${r.status!=='PAID'?`<a class="secondary-button" href="../registrar-pagamento/registrar-pagamento.html?id=${r.id}">Pagamento</a>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty());
}catch(error){renderError(root,error);}}
