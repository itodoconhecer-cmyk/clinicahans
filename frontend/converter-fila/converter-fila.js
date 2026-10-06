import { waitlistApi, doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'converter-fila',title:'Converter fila em agendamento',roles:["RECEPCAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const id=queryParam('id');const doctors=await doctorApi.search('',100);root.innerHTML=`<form id="form" class="panel form-grid"><label>Médico<select name="doctorId"><option value="">Usar preferência</option>${doctors.map(d=>`<option value="${d.id}">${escapeHtml(d.fullName)}</option>`).join('')}</select></label><label>Data/hora<input name="startsAt" type="datetime-local" required></label><label>Duração<input name="durationMinutes" type="number" value="30"></label><label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option></select></label><button class="primary-button">Converter</button></form>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const b=Object.fromEntries(f.entries());b.doctorId=b.doctorId||null;b.startsAt=new Date(b.startsAt).toISOString();b.durationMinutes=Number(b.durationMinutes);try{await waitlistApi.convert(id,b);showToast('Fila convertida em consulta.','success');window.location.href='../fila-espera/fila-espera.html';}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
