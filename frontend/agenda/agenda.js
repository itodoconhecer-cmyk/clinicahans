import { appointmentApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'agenda',title:'Agenda',roles:["RECEPCAO","MEDICO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const [from,to]=localDayRange();const rows=await appointmentApi.list(from,to);
    root.innerHTML=`<div class="panel-header"><h2>Agenda do dia</h2><a class="primary-button" href="../novo-agendamento/novo-agendamento.html">Novo agendamento</a></div>`+(rows.length?`<div class="table-wrap"><table><thead><tr><th>Horário</th><th>Paciente</th><th>Médico</th><th>Status</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${formatDateTime(a.startsAt)}</td><td>${escapeHtml(a.patientId)}</td><td>${escapeHtml(a.doctorId)}</td><td>${badge(a.status,toneForStatus(a.status))}</td></tr>`).join('')}</tbody></table></div>`:empty());
  }catch(error){renderError(root,error);}
}
