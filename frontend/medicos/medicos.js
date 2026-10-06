import { doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'medicos',title:'Médicos',roles:["RECEPCAO","MEDICO","GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    root.innerHTML=`<div class="panel-header"><h2>Corpo clínico</h2><a class="primary-button" href="../cadastro-medico/cadastro-medico.html">Novo médico</a></div><div class="filters"><input id="q" placeholder="Nome, CRM, RQE ou especialidade"><button id="buscar" class="secondary-button">Buscar</button></div><div id="resultado"></div>`;const load=async()=>{const rows=await doctorApi.search(root.querySelector('#q').value,100);root.querySelector('#resultado').innerHTML=rows.length?`<div class="cards">${rows.map(d=>`<article class="card"><h3>${escapeHtml(d.fullName)}</h3><p>CRM ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</p><a class="secondary-button" href="../detalhe-medico/detalhe-medico.html?id=${d.id}">Detalhes</a></article>`).join('')}</div>`:empty();};root.querySelector('#buscar').addEventListener('click',()=>load().catch(e=>renderError(root,e)));await load();
  }catch(error){renderError(root,error);}
}
