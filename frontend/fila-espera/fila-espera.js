import { waitlistApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'fila-espera',title:'Fila de espera',roles:["RECEPCAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    const rows=await waitlistApi.list();root.innerHTML=`<div class="panel-header"><h2>Pacientes aguardando vaga</h2></div>`+(rows.length?`<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Prioridade</th><th>Preferência</th><th>Ação</th></tr></thead><tbody>${rows.map(w=>`<tr><td>${escapeHtml(w.patientId)}</td><td>${w.priority}</td><td>${formatDateTime(w.preferredFrom)} — ${formatDateTime(w.preferredTo)}</td><td><a class="secondary-button" href="../converter-fila/converter-fila.html?id=${w.id}">Converter</a></td></tr>`).join('')}</tbody></table></div>`:empty());
  }catch(error){renderError(root,error);}
}
