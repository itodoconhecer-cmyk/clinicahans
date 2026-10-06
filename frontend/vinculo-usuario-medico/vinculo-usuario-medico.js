import { doctorApi, adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'vinculo-usuario-medico',title:'Vínculo usuário e médico',roles:["ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const id=queryParam('id'),users=await adminApi.users();root.innerHTML=`<form id="form" class="panel form-grid"><label>Usuário<select name="userId">${users.filter(u=>u.active).map(u=>`<option value="${u.id}">${escapeHtml(u.username)} — ${escapeHtml((u.roles||[]).join(', '))}</option>`).join('')}</select></label><button class="primary-button">Vincular</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();try{await doctorApi.linkUser(id,new FormData(e.currentTarget).get('userId'));showToast('Usuário vinculado.','success');}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
