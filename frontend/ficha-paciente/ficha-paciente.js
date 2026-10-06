import { patientApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'ficha-paciente',title:'Ficha administrativa do paciente',roles:["RECEPCAO","MEDICO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const p=await patientApi.get(queryParam('id'));root.innerHTML=`<article class="panel"><div class="panel-header"><h2>${escapeHtml(p.fullName)}</h2><a class="secondary-button" href="../editar-paciente/editar-paciente.html?id=${p.id}">Editar</a></div><p><strong>CPF:</strong> ${escapeHtml(p.cpf||'não informado')}</p><p><strong>Nascimento:</strong> ${formatDate(p.birthDate)}</p><p><strong>Telefone:</strong> ${escapeHtml(p.phone||'')}</p><p><strong>E-mail:</strong> ${escapeHtml(p.email||'')}</p></article>`;
  }catch(error){renderError(root,error);}
}
