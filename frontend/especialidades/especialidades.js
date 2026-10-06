import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'especialidades',title:'Especialidades',roles:["GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const load=async()=>{const rows=await doctorApi.specialties();root.innerHTML=`<div class="two-columns"><form id="form" class="panel form-grid"><h2>Nova especialidade</h2><label>Nome<input name="name" required></label><label>Sistema externo<input name="externalSystem"></label><label>Código<input name="externalCode"></label><button class="primary-button">Cadastrar</button></form><article class="panel"><h2>Catálogo</h2>${rows.length?`<div class="table-wrap"><table><tbody>${rows.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.externalCode||'—')}</td></tr>`).join('')}</tbody></table></div>`:empty()}</article></div>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();try{await doctorApi.createSpecialty(Object.fromEntries(new FormData(e.currentTarget).entries()));await load();}catch(error){renderError(root,error);}});};await load();
  }catch(error){renderError(root,error);}
}
