import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'receber-resultado',title:'Receber resultado',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id');root.innerHTML=`<form id="form" class="panel form-grid"><label>Storage key<input name="storageKey" required></label><label>MIME<input name="mimeType" value="application/pdf" required></label><button class="primary-button">Registrar resultado</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();await continuityApi.receiveResult(id,Object.fromEntries(new FormData(e.currentTarget).entries()));window.location.href=`../revisar-resultado/revisar-resultado.html?id=${id}`;});
}catch(error){renderError(root,error);}}
