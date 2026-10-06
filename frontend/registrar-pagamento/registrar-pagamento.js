import { financeApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'registrar-pagamento',title:'Registrar pagamento',roles:["RECEPCAO","GESTAO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id');root.innerHTML=`<form id="form" class="panel form-grid"><label>Valor<input name="amount" type="number" step="0.01" required></label><label>Forma<input name="method" required></label><button class="primary-button">Registrar pagamento</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.amount=Number(b.amount);await financeApi.pay(id,b);window.location.href='../faturamento/faturamento.html';});
}catch(error){renderError(root,error);}}
