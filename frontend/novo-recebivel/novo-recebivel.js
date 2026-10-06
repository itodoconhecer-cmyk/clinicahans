import { financeApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'novo-recebivel',title:'Novo recebível',roles:["RECEPCAO","GESTAO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Atendimento finalizado<input name="encounterId" required></label><label>Pagador<select name="payerType"><option>PRIVATE</option><option>INSURANCE</option></select></label><label>Referência<input name="payerReference"></label><label>Valor<input name="amount" type="number" step="0.01" required></label><label>Vencimento<input name="dueDate" type="date"></label><button class="primary-button">Criar recebível</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.amount=Number(b.amount);b.dueDate=b.dueDate||null;await financeApi.create(b);window.location.href='../faturamento/faturamento.html';});
}catch(error){renderError(root,error);}}
