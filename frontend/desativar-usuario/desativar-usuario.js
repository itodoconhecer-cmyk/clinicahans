import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'desativar-usuario',title:'Desativar usuário',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('id'),users=await adminApi.users(),u=users.find(x=>x.id===id);root.innerHTML=`<article class="panel"><h2>${escapeHtml(u?.username||id)}</h2><p>Esta ação revoga o acesso nas próximas requisições.</p><button id="off" class="danger-button">Desativar usuário</button></article>`;root.querySelector('#off').addEventListener('click',async()=>{await adminApi.deactivateUser(id);window.location.href='../usuarios/usuarios.html';});
}catch(error){renderError(root,error);}}
