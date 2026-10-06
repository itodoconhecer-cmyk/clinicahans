import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'atendimento',title:'Atendimento clínico',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Agendamento em CHECKED_IN<input name="appointmentId" value="${escapeHtml(queryParam('appointmentId')||'')}" required></label><button class="primary-button">Iniciar atendimento</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();try{const x=await clinicalApi.startEncounter(new FormData(e.currentTarget).get('appointmentId'));window.location.href=`../salvar-rascunho/salvar-rascunho.html?id=${x.id}&version=${x.version}`;}catch(error){renderError(root,error);}});
}catch(error){renderError(root,error);}}
