import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'retornos',title:'Acompanhamentos e retornos',roles:["RECEPCAO","MEDICO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const rows=await continuityApi.followUps();root.innerHTML=`<div class="panel-header"><h2>Fila operacional</h2><a class="primary-button" href="../novo-acompanhamento/novo-acompanhamento.html">Novo acompanhamento</a></div>`+(rows.length?`<div class="table-wrap"><table><tbody>${rows.map(x=>`<tr><td>${escapeHtml(x.patientName)}</td><td>${badge(x.status,toneForStatus(x.status))}</td><td>${formatDateTime(x.dueAt)}</td><td><a class="secondary-button" href="../registrar-acao/registrar-acao.html?id=${x.id}">Registrar ação</a></td></tr>`).join('')}</tbody></table></div>`:empty());
}catch(error){renderError(root,error);}}
