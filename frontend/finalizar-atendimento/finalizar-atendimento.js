import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'finalizar-atendimento',title:'Finalizar atendimento',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id'),version=Number(queryParam('version')||0);root.innerHTML=`<article class="panel"><p>Ao finalizar, o atendimento original torna-se imutável.</p><button id="finalizar" class="primary-button">Finalizar atendimento</button></article>`;root.querySelector('#finalizar').addEventListener('click',async()=>{try{await clinicalApi.finalize(id,version);showToast('Atendimento finalizado.','success');root.innerHTML=`<div class="state-card"><strong>Finalizado.</strong><p>Correções posteriores devem usar adendo.</p><a class="secondary-button" href="../adendo/adendo.html?id=${id}">Criar adendo</a></div>`;}catch(error){renderError(root,error);}});
}catch(error){renderError(root,error);}}
