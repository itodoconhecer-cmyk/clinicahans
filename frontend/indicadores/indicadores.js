import { managementApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'indicadores',title:'Indicadores',roles:["GESTAO","ADMIN"]});
if(root){void init();}
async function init(){try{
  
  const [from,to]=monthRange(),d=await managementApi.dashboard(from,to);root.innerHTML=`<div class="metric-grid"><article class="metric-card"><span>Agendamentos</span><strong>${d.appointments}</strong></article><article class="metric-card"><span>No-show</span><strong>${Number(d.noShowRate).toFixed(1)}%</strong></article><article class="metric-card"><span>Cancelamentos</span><strong>${d.cancelled}</strong></article><article class="metric-card"><span>Recebíveis</span><strong>${formatMoney(d.grossReceivables)}</strong></article></div>`;
}catch(error){renderError(root,error);}}
