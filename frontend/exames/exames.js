import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'exames',title:'Exames pendentes',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const rows=await continuityApi.pendingExams();root.innerHTML=`<div class="panel-header"><h2>Exames</h2><a class="primary-button" href="../novo-exame/novo-exame.html">Novo exame</a></div>`+(rows.length?`<div class="table-wrap"><table><tbody>${rows.map(e=>`<tr><td>${escapeHtml(e.examName)}</td><td>${badge(e.status,toneForStatus(e.status))}</td><td>${e.status==='RESULT_RECEIVED'?`<a class="secondary-button" href="../revisar-resultado/revisar-resultado.html?id=${e.id}">Revisar</a>`:`<a class="secondary-button" href="../receber-resultado/receber-resultado.html?id=${e.id}">Receber resultado</a>`}</td></tr>`).join('')}</tbody></table></div>`:empty());
}catch(error){renderError(root,error);}}
