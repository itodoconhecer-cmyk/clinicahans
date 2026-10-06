import { continuityApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'revisar-resultado',title:'Revisar resultado',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const orderId=queryParam('id'),r=await continuityApi.resultForExam(orderId);root.innerHTML=`<form id="form" class="panel form-grid"><p><strong>${escapeHtml(r.storageKey)}</strong></p><label>Nota<textarea name="note"></textarea></label><button class="primary-button">Marcar como revisado</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();await continuityApi.reviewResult(r.id,new FormData(e.currentTarget).get('note'));window.location.href='../exames/exames.html';});
}catch(error){renderError(root,error);}}
