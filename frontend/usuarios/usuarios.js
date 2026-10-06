import { adminApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'usuarios',title:'Usuários',roles:["ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const rows=await adminApi.users();root.innerHTML=`<div class="panel-header"><h2>Usuários</h2><a class="primary-button" href="../criar-usuario/criar-usuario.html">Novo usuário</a></div><div class="table-wrap"><table><tbody>${rows.map(u=>`<tr><td>${escapeHtml(u.username)}</td><td>${escapeHtml((u.roles||[]).join(', '))}</td><td>${badge(u.active?'ACTIVE':'INACTIVE',u.active?'success':'danger')}</td><td>${u.active?`<a class="danger-button" href="../desativar-usuario/desativar-usuario.html?id=${u.id}">Desativar</a>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}catch(error){renderError(root,error);}}
