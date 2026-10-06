import { clinicalApi } from '../services/api.js';
import { mountScreen, renderError, showToast, queryParam, toneForStatus, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
const root=mountScreen({key:'documentos-clinicos',title:'Documentos clínicos',roles:["MEDICO"]});
if(root){void init();}
async function init(){try{
  
  const id=queryParam('patientId');const load=async()=>{const rows=await clinicalApi.documents(id);root.innerHTML=`<form id="form" class="panel form-grid"><label>Atendimento (opcional)<input name="encounterId"></label><label>Tipo<input name="documentType" required></label><label>Storage key<input name="storageKey" required></label><label>MIME<input name="mimeType" value="application/pdf" required></label><label>Checksum<input name="checksum"></label><button class="primary-button">Registrar documento</button></form><article class="panel">${rows.map(d=>`<p><strong>${escapeHtml(d.documentType)}</strong> · ${escapeHtml(d.mimeType)}<br><small>${escapeHtml(d.storageKey)}</small></p>`).join('')||'<p>Nenhum.</p>'}</article>`;root.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.encounterId=b.encounterId||null;await clinicalApi.addDocument(id,b);await load();});};await load();
}catch(error){renderError(root,error);}}
