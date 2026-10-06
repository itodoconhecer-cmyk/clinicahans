import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'detalhe-medico',title:'Detalhe do médico',roles:["RECEPCAO","MEDICO","GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const d=await doctorApi.get(queryParam('id'));root.innerHTML=`<article class="panel"><h2>${escapeHtml(d.fullName)}</h2><p>CRM ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)} · RQE ${escapeHtml(d.rqe||'—')}</p><p>Status: ${badge(d.status,toneForStatus(d.status))}</p><div class="toolbar"><a class="secondary-button" href="../disponibilidade-medica/disponibilidade-medica.html?id=${d.id}">Disponibilidade</a><a class="secondary-button" href="../bloqueios-agenda/bloqueios-agenda.html?id=${d.id}">Bloqueios</a><a class="secondary-button" href="../vinculo-usuario-medico/vinculo-usuario-medico.html?id=${d.id}">Vínculo de usuário</a></div></article>`;
  }catch(error){renderError(root,error);}
}
