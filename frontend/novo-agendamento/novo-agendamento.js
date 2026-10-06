import { appointmentApi, patientApi, doctorApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'novo-agendamento',title:'Novo agendamento',roles:["RECEPCAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const [patients,doctors]=await Promise.all([patientApi.search('',100),doctorApi.search('',100)]);
    root.innerHTML=`<form id="form" class="panel form-grid two"><label>Paciente<select name="patientId" required>${patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></label><label>Médico<select name="doctorId" required>${doctors.map(d=>`<option value="${d.id}">${escapeHtml(d.fullName)} — ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</option>`).join('')}</select></label><label>Data/hora<input name="startsAt" type="datetime-local" required></label><label>Duração<input name="durationMinutes" type="number" value="30"></label><label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option><option>HIBRIDO</option></select></label><label>Observação<input name="notes"></label><div class="form-actions"><button class="primary-button">Agendar</button></div></form>`;
    root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const b=Object.fromEntries(f.entries());b.startsAt=new Date(b.startsAt).toISOString();b.durationMinutes=Number(b.durationMinutes);try{await appointmentApi.create(b);showToast('Agendamento criado.','success');window.location.href='../agenda/agenda.html';}catch(error){renderError(root,error);}});
  }catch(error){renderError(root,error);}
}
