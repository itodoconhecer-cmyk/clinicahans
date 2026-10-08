import { adminApi } from '../services/api.js?v=2';
import { mountScreen, renderError, showToast } from '../shared/screen.js';
import { escapeHtml } from '../utils/html.js';
import { loading } from '../components/ui.js';

const root=mountScreen({key:'criar-usuario',title:'Criar usuário',roles:["ADMIN"]});
const roleLabels={ADMIN:'Administrador',MEDICO:'Médico',RECEPCAO:'Recepção',GESTAO:'Gestão'};

if(root){void init();}

async function init(){
  root.innerHTML=loading('Carregando perfis disponíveis...');
  try{
    const roles=await adminApi.roles();
    const roleOptions=roles.map(role=>`
      <label class="role-option">
        <input type="checkbox" name="roles" value="${escapeHtml(role)}">
        <span>${escapeHtml(roleLabels[role]||role)} <small>${escapeHtml(role)}</small></span>
      </label>
    `).join('');

    root.innerHTML=`
      <form id="form" class="panel form-grid">
        <label>Usuário<input name="username" autocomplete="username" required maxlength="120"></label>
        <label>Senha<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="200" required></label>
        <fieldset class="role-selection" aria-describedby="roles-help">
          <legend>Perfis de acesso</legend>
          <p id="roles-help">${roles.length?'Selecione um ou mais perfis para este usuário.':'Nenhum perfil está configurado para seleção.'}</p>
          <div class="role-options">${roleOptions}</div>
        </fieldset>
        <button class="primary-button" type="submit" ${roles.length?'':'disabled'}>Criar usuário</button>
      </form>`;

    root.querySelector('#form').addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget;
      const selectedRoles=[...form.querySelectorAll('input[name="roles"]:checked')].map(input=>input.value);
      if(!selectedRoles.length){
        showToast('Selecione ao menos um perfil.', 'error');
        form.querySelector('input[name="roles"]')?.focus();
        return;
      }

      const submitButton=form.querySelector('button[type="submit"]');
      submitButton.disabled=true;
      submitButton.textContent='Criando...';
      try{
        const formData=new FormData(form);
        await adminApi.createUser({
          username:formData.get('username'),
          password:formData.get('password'),
          roles:selectedRoles
        });
        window.location.href='../usuarios/usuarios.html';
      }catch(error){
        renderError(root,error);
      }
    });
  }catch(error){
    renderError(root,error);
  }
}
