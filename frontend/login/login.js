import { authApi, ApiError } from '../services/api.js';
import { session } from '../state/session.js';
import { errorCard } from '../components/ui.js';
const form=document.getElementById('login-form');
if(session.get()) window.location.replace('../visao-geral/visao-geral.html');
form.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(form);const btn=form.querySelector('button');btn.disabled=true;try{const r=await authApi.login(fd.get('username'),fd.get('password'));session.set({accessToken:r.accessToken,roles:r.roles||[],username:fd.get('username')});window.location.replace('../visao-geral/visao-geral.html');}catch(error){const x=error instanceof ApiError?error:new ApiError(error?.message||'Erro inesperado');document.getElementById('login-error').innerHTML=errorCard(x.message,x.correlationId);}finally{btn.disabled=false;}});