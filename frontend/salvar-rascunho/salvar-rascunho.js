import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'salvar-rascunho',title:'Salvar rascunho',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id'),version=Number(queryParam('version')||0);root.innerHTML=`<form id="form" class="panel form-grid"><label>Queixa<textarea name="chiefComplaint"></textarea></label><label>Avaliação<textarea name="assessment"></textarea></label><label>Plano<textarea name="plan"></textarea></label><button class="primary-button">Salvar rascunho</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.version=version;const x=await clinicalApi.saveDraft(id,b);window.location.href=`../finalizar-atendimento/finalizar-atendimento.html?id=${x.id}&version=${x.version}`;});
}catch(error){renderError(root,error);}}
