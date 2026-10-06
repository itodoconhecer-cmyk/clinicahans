import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'cadastro-medico',title:'Cadastro de médico',roles:["GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    root.innerHTML=`<form id="form" class="panel form-grid two"><label>Nome<input name="fullName" required></label><label>CPF<input name="cpf"></label><label>CRM<input name="crm" required></label><label>UF<input name="crmState" maxlength="2" required></label><label>RQE<input name="rqe"></label><label>Telefone<input name="phone"></label><label>E-mail<input name="email"></label><label>Status<select name="status"><option>ACTIVE</option><option>INACTIVE</option><option>AWAY</option></select></label><label>Duração padrão<input name="defaultAppointmentMinutes" type="number" value="30"></label><label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option><option>HIBRIDO</option></select></label><button class="primary-button">Cadastrar</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.defaultAppointmentMinutes=Number(b.defaultAppointmentMinutes);try{const d=await doctorApi.create(b);window.location.href=`../detalhe-medico/detalhe-medico.html?id=${d.id}`;}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
