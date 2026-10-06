import { patientApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'cadastro-paciente',title:'Cadastro de paciente',roles:["RECEPCAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    root.innerHTML=`<form id="form" class="panel form-grid two"><label>Nome completo<input name="fullName" required></label><label>CPF<input name="cpf"></label><label>Nascimento<input name="birthDate" type="date" required></label><label>Telefone<input name="phone"></label><label>E-mail<input name="email" type="email"></label><button class="primary-button">Cadastrar</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();try{const p=await patientApi.create(Object.fromEntries(new FormData(e.currentTarget).entries()));window.location.href=`../ficha-paciente/ficha-paciente.html?id=${p.id}`;}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
