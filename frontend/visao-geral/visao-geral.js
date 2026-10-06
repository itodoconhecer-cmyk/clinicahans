import { appointmentApi, managementApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, closeModal, openModal, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';

const root=mountScreen({key:'visao-geral',title:'Visão geral',roles:["RECEPCAO","MEDICO","GESTAO","ADMIN"]});
if(root){void init();}

async function init(){
  try{
    
    if((window.sessionStorage.getItem('clinicaHans.session')||'').includes('GESTAO')||(window.sessionStorage.getItem('clinicaHans.session')||'').includes('ADMIN')){
      const [from,to]=monthRange();const d=await managementApi.dashboard(from,to);
      root.innerHTML=`<div class="metric-grid"><article class="metric-card"><span>Agendamentos</span><strong>${d.appointments}</strong></article><article class="metric-card"><span>No-show</span><strong>${Number(d.noShowRate).toFixed(1)}%</strong></article><article class="metric-card"><span>Follow-ups</span><strong>${d.openFollowUps}</strong></article><article class="metric-card"><span>Recebíveis</span><strong>${formatMoney(d.grossReceivables)}</strong></article></div>`;
    }else{
      const [from,to]=localDayRange();const rows=await appointmentApi.list(from,to);
      root.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Horário</th><th>Status</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${formatDateTime(a.startsAt)}</td><td>${badge(a.status,toneForStatus(a.status))}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma consulta hoje.');
    }
  }catch(error){renderError(root,error);}
}
