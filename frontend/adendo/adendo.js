import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'adendo',title:'Adendo ao atendimento',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id');root.innerHTML=`<form id="form" class="panel form-grid"><label>Motivo<textarea name="reason" required></textarea></label><label>Conteúdo<textarea name="content" required></textarea></label><button class="primary-button">Registrar adendo</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();await clinicalApi.addAddendum(id,Object.fromEntries(new FormData(e.currentTarget).entries()));showToast('Adendo registrado.','success');});
}catch(error){renderError(root,error);}}
