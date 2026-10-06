import { patientApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'pacientes',title:'Pacientes',roles:["RECEPCAO","MEDICO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    root.innerHTML=`<div class="panel-header"><h2>Pacientes</h2><a class="primary-button" href="../cadastro-paciente/cadastro-paciente.html">Novo paciente</a></div><div class="filters"><input id="q" placeholder="Nome, CPF ou telefone"><button id="buscar" class="secondary-button">Buscar</button></div><div id="resultado"></div>`;const load=async()=>{const rows=await patientApi.search(root.querySelector('#q').value,100);root.querySelector('#resultado').innerHTML=rows.length?`<div class="cards">${rows.map(p=>`<article class="card"><h3>${escapeHtml(p.fullName)}</h3><p>${escapeHtml(p.cpf||'')}</p><a class="secondary-button" href="../ficha-paciente/ficha-paciente.html?id=${p.id}">Abrir ficha</a></article>`).join('')}</div>`:empty();};root.querySelector('#buscar').addEventListener('click',()=>load().catch(e=>renderError(root,e)));await load();
  }catch(error){renderError(root,error);}
}
