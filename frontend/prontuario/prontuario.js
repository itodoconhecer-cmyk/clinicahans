import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'prontuario',title:'Prontuário integrado',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const patientId=queryParam('patientId');if(!patientId){root.innerHTML='<div class="state-card"><p>Abra o prontuário a partir da ficha do paciente.</p></div>';return;}
  const [snapshot,timeline,documents]=await Promise.all([clinicalApi.snapshot(patientId),clinicalApi.timeline(patientId),clinicalApi.documents(patientId)]);
  root.innerHTML=`<div class="toolbar"><a class="secondary-button" href="../safety-snapshot/safety-snapshot.html?patientId=${patientId}">Safety snapshot</a><a class="secondary-button" href="../linha-tempo/linha-tempo.html?patientId=${patientId}">Linha do tempo</a><a class="secondary-button" href="../alergias-alertas/alergias-alertas.html?patientId=${patientId}">Alergias/alertas</a><a class="secondary-button" href="../medicamentos/medicamentos.html?patientId=${patientId}">Medicamentos</a><a class="secondary-button" href="../condicoes-clinicas/condicoes-clinicas.html?patientId=${patientId}">Condições</a><a class="secondary-button" href="../documentos-clinicos/documentos-clinicos.html?patientId=${patientId}">Documentos</a></div><div class="three-columns"><article class="card"><h3>Alertas</h3><strong>${snapshot.alerts?.length||0}</strong></article><article class="card"><h3>Eventos</h3><strong>${timeline.length}</strong></article><article class="card"><h3>Documentos</h3><strong>${documents.length}</strong></article></div>`;
}catch(error){renderError(root,error);}}
