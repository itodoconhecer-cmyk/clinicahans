import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'criar-usuario',title:'Criar usuário',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  root.innerHTML=`<form id="form" class="panel form-grid"><label>Usuário<input name="username" required></label><label>Senha<input name="password" type="password" minlength="12" required></label><label>Perfis<input name="roles" placeholder="MEDICO,ADMIN" required></label><button class="primary-button">Criar usuário</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await adminApi.createUser({username:f.get('username'),password:f.get('password'),roles:String(f.get('roles')).split(',').map(x=>x.trim()).filter(Boolean)});window.location.href='../usuarios/usuarios.html';});
}catch(error){renderError(root,error);}}
