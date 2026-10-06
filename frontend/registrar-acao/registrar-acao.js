import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'registrar-acao',title:'Registrar ação de acompanhamento',roles:["RECEPCAO","MEDICO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id');root.innerHTML=`<form id="form" class="panel form-grid"><label>Tipo<input name="actionType" required></label><label>Nota<textarea name="note"></textarea></label><label>Concluir<select name="close"><option value="false">Não</option><option value="true">Sim</option></select></label><button class="primary-button">Registrar ação</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.close=b.close==='true';await continuityApi.addFollowUpAction(id,b);window.location.href='../retornos/retornos.html';});
}catch(error){renderError(root,error);}}
