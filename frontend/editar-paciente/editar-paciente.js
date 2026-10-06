import { patientApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'editar-paciente',title:'Editar paciente',roles:["RECEPCAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const id=queryParam('id'),p=await patientApi.get(id);root.innerHTML=`<form id="form" class="panel form-grid"><label>Nome<input name="fullName" value="${escapeHtml(p.fullName)}" required></label><label>Telefone<input name="phone" value="${escapeHtml(p.phone||'')}"></label><label>E-mail<input name="email" value="${escapeHtml(p.email||'')}"></label><button class="primary-button">Salvar</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.version=p.version;try{await patientApi.update(id,b);window.location.href=`../ficha-paciente/ficha-paciente.html?id=${id}`;}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
