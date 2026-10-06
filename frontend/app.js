import { session } from './state/session.js';
import {
  authApi, patientApi, doctorApi, appointmentApi, waitlistApi, clinicalApi,
  continuityApi, financeApi, managementApi, adminApi, ApiError
} from './services/api.js';
import { escapeHtml, formatDateTime, formatDate, formatMoney } from './utils/html.js';
import { showToast, loading, empty, errorCard, badge } from './components/ui.js';

const root = document.getElementById('app');
let selectedPatientId = null;
let selectedAppointmentId = null;
let activeEncounter = null;

const routes = {
  dashboard: { label: 'Visão geral', roles: ['RECEPCAO','MEDICO','GESTAO','ADMIN'], render: renderDashboard },
  agenda: { label: 'Agenda', roles: ['RECEPCAO','MEDICO','GESTAO','ADMIN'], render: renderAgenda },
  waitlist: { label: 'Fila de espera', roles: ['RECEPCAO','ADMIN'], render: renderWaitlist },
  patients: { label: 'Pacientes', roles: ['RECEPCAO','MEDICO','ADMIN'], render: renderPatientsFull },
  doctors: { label: 'Médicos', roles: ['RECEPCAO','MEDICO','GESTAO','ADMIN'], render: renderDoctorsFull },
  specialties: { label: 'Especialidades', roles: ['GESTAO','ADMIN'], render: renderSpecialties },
  clinical: { label: 'Prontuário', roles: ['MEDICO','ADMIN'], render: renderClinicalFull },
  encounter: { label: 'Atendimento', roles: ['MEDICO','ADMIN'], render: renderEncounter },
  exams: { label: 'Exames', roles: ['MEDICO','ADMIN'], render: renderExams },
  followups: { label: 'Retornos', roles: ['RECEPCAO','MEDICO','ADMIN'], render: renderFollowUps },
  finance: { label: 'Faturamento', roles: ['RECEPCAO','GESTAO','ADMIN'], render: renderFinanceFull },
  indicators: { label: 'Indicadores', roles: ['GESTAO','ADMIN'], render: renderIndicators },
  admin: { label: 'Usuários', roles: ['ADMIN'], render: renderAdminFull },
  audit: { label: 'Auditoria', roles: ['ADMIN'], render: renderAudit }
};

function hasAccess(route) {
  return route.roles.some(role => session.hasRole(role));
}

function currentRouteName() {
  return location.hash.replace('#/','').split('?')[0] || 'dashboard';
}

function navigate(name) {
  location.hash = '#/' + name;
}

function shell() {
  const s = session.get();
  const nav = Object.entries(routes).filter(([,route]) => hasAccess(route)).map(([name,route]) =>
    `<button class="nav-item ${currentRouteName()===name?'active':''}" data-route="${name}">${route.label}</button>`
  ).join('');
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">H+</div>
          <div><span class="brand-kicker">CLÍNICA</span><strong>HANS</strong><small>Saúde com tecnologia e cuidado</small></div>
        </div>
        <nav class="nav-list">${nav}</nav>
        <div class="sidebar-footer">
          <span>${escapeHtml((s?.roles || []).join(' · '))}</span>
          <button class="secondary-button" id="logout">Sair</button>
        </div>
      </aside>
      <main class="content">
        <header class="topbar">
          <div><p class="eyebrow">Clínica Hans</p><h1 id="page-title">Carregando</h1></div>
          <div class="user-actions"><span class="user-chip">${escapeHtml(s?.username || 'usuário')}</span></div>
        </header>
        <section id="view-root">${loading()}</section>
      </main>
    </div>`;
  root.querySelectorAll('[data-route]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.route)));
  root.querySelector('#logout').addEventListener('click', () => { session.clear(); navigate('login'); render(); });
}

async function render() {
  if (!session.get()) {
    renderLogin();
    return;
  }
  const name = currentRouteName();
  const route = routes[name] || routes.dashboard;
  if (!hasAccess(route)) {
    navigate('dashboard');
    return;
  }
  shell();
  document.getElementById('page-title').textContent = route.label;
  try {
    await route.render(document.getElementById('view-root'));
  } catch (err) {
    renderError(document.getElementById('view-root'), err);
  }
}

function renderLogin() {
  root.innerHTML = `
    <main class="login-shell">
      <form class="login-card" id="login-form">
        <div class="brand"><div class="brand-mark">H+</div><div><span class="brand-kicker">CLÍNICA</span><strong>HANS</strong><small>Ambiente assistencial</small></div></div>
        <h1>Acessar sistema</h1>
        <p>Use sua conta individual. O acesso é controlado por perfil e auditado quando necessário.</p>
        <div class="form-grid">
          <label>Usuário<input name="username" required autocomplete="username"></label>
          <label>Senha<input name="password" type="password" required autocomplete="current-password"></label>
          <button class="primary-button" type="submit">Entrar</button>
        </div>
        <div id="login-error"></div>
      </form>
    </main>`;
  root.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button');
    button.disabled = true; button.textContent = 'Entrando...';
    try {
      const result = await authApi.login(form.get('username'), form.get('password'));
      session.set({ accessToken: result.accessToken, roles: result.roles || [], username: form.get('username') });
      navigate('dashboard');
      await render();
    } catch (err) {
      renderError(root.querySelector('#login-error'), err);
    } finally {
      button.disabled = false; button.textContent = 'Entrar';
    }
  });
}

function renderError(target, err) {
  const e = err instanceof ApiError ? err : new ApiError(err?.message || 'Erro inesperado.');
  target.innerHTML = errorCard(e.message, e.correlationId);
}

function toneForStatus(status='') {
  const s = status.toUpperCase();
  if (['COMPLETED','PAID','REVIEWED','ACTIVE','CLOSED','RESOLVED','CONFIRMED'].includes(s)) return 'success';
  if (['CANCELLED','NO_SHOW','CRITICAL','OVERDUE'].includes(s)) return 'danger';
  return 'warning';
}

function localDayRange() {
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+1);
  return [start.toISOString(), end.toISOString()];
}
function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const iso = d => d.toISOString().slice(0,10);
  return [iso(from), iso(to)];
}

async function renderDashboard(target) {
  if (session.hasAnyRole('GESTAO','ADMIN')) {
    const [from,to] = monthRange();
    const d = await managementApi.dashboard(from,to);
    target.innerHTML = `
      <div class="metric-grid">
        <article class="metric-card"><span>Agendamentos</span><strong>${d.appointments}</strong><small>no período</small></article>
        <article class="metric-card"><span>Taxa de ausência</span><strong>${Number(d.noShowRate).toFixed(1)}%</strong><small>${d.noShows} faltas</small></article>
        <article class="metric-card"><span>Acompanhamentos abertos</span><strong>${d.openFollowUps}</strong><small>continuidade</small></article>
        <article class="metric-card"><span>Recebíveis brutos</span><strong>${formatMoney(d.grossReceivables)}</strong><small>no período</small></article>
      </div>
      <div class="two-columns">
        <article class="panel"><div class="panel-header"><h2>Operação</h2></div><p>Cancelamentos: <strong>${d.cancelled}</strong></p><p>Exames pendentes: <strong>${d.pendingExams}</strong></p></article>
        <article class="panel"><div class="panel-header"><h2>Privacidade</h2></div><p>Este painel contém apenas métricas agregadas. Conteúdo clínico detalhado não é disponibilizado ao perfil de Gestão.</p></article>
      </div>`;
    return;
  }
  const [from,to] = localDayRange();
  const appointments = await appointmentApi.list(from,to);
  target.innerHTML = `
    <div class="metric-grid">
      <article class="metric-card"><span>Consultas hoje</span><strong>${appointments.length}</strong><small>agenda do dia</small></article>
      <article class="metric-card"><span>Confirmadas</span><strong>${appointments.filter(a=>a.status==='CONFIRMED').length}</strong><small>aguardando chegada</small></article>
      <article class="metric-card"><span>Em atendimento</span><strong>${appointments.filter(a=>a.status==='IN_CARE').length}</strong><small>agora</small></article>
      <article class="metric-card"><span>Concluídas</span><strong>${appointments.filter(a=>a.status==='COMPLETED').length}</strong><small>hoje</small></article>
    </div>
    <article class="panel">
      <div class="panel-header"><h2>Agenda de hoje</h2><button class="secondary-button" id="go-agenda">Abrir agenda</button></div>
      ${appointments.length ? appointmentTable(appointments) : empty('Nenhuma consulta na agenda de hoje.')}
    </article>`;
  target.querySelector('#go-agenda')?.addEventListener('click',()=>navigate('agenda'));
}

async function renderPatients(target) {
  target.innerHTML = `
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Cadastro</p><h2>Pacientes</h2></div>${session.hasAnyRole('RECEPCAO','ADMIN')?'<button class="primary-button" id="new-patient">+ Novo paciente</button>':''}</div>
      <div class="filters"><input id="patient-q" placeholder="Buscar por nome, CPF ou telefone"><button class="secondary-button" id="patient-search">Buscar</button></div>
      <div id="patient-results">${loading()}</div>
    </article>`;
  const result = target.querySelector('#patient-results');
  const load = async () => {
    result.innerHTML = loading();
    try {
      const patients = await patientApi.search(target.querySelector('#patient-q').value);
      result.innerHTML = patients.length ? `<div class="cards">${patients.map(p=>`
        <article class="card"><h3>${escapeHtml(p.fullName)}</h3><p>${escapeHtml(p.cpf || 'CPF não informado')}</p><p>${escapeHtml(p.phone || 'Telefone não informado')}</p><button class="secondary-button" data-patient="${p.id}">Selecionar</button></article>`).join('')}</div>` : empty();
      result.querySelectorAll('[data-patient]').forEach(btn=>btn.addEventListener('click',()=>{
        selectedPatientId=btn.dataset.patient;
        showToast('Paciente selecionado.');
        if(session.hasAnyRole('MEDICO','ADMIN')) navigate('clinical');
      }));
    } catch(err){ renderError(result,err); }
  };
  target.querySelector('#patient-search').addEventListener('click',load);
  target.querySelector('#patient-q').addEventListener('keydown',e=>{if(e.key==='Enter') load();});
  target.querySelector('#new-patient')?.addEventListener('click',()=>openPatientModal(load));
  await load();
}

function openPatientModal(onSaved) {
  openModal('Novo paciente', `
    <form id="patient-form" class="form-grid two">
      <label>Nome completo<input name="fullName" required maxlength="180"></label>
      <label>CPF<input name="cpf" placeholder="000.000.000-00"></label>
      <label>Data de nascimento<input name="birthDate" type="date" required></label>
      <label>Telefone<input name="phone"></label>
      <label>E-mail<input name="email" type="email"></label>
      <div class="form-actions"><button class="primary-button">Cadastrar</button></div>
    </form>`, modal => {
      modal.querySelector('#patient-form').addEventListener('submit',async e=>{
        e.preventDefault(); const f=new FormData(e.currentTarget);
        try{
          await patientApi.create(Object.fromEntries(f.entries()));
          closeModal(); showToast('Paciente cadastrado.','success'); await onSaved();
        }catch(err){showToast(err.message,'error');}
      });
    });
}

async function renderDoctors(target) {
  target.innerHTML = `
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Corpo clínico</p><h2>Médicos</h2></div>${session.hasAnyRole('GESTAO','ADMIN')?'<button class="primary-button" id="new-doctor">+ Novo médico</button>':''}</div>
      <div class="filters"><input id="doctor-q" placeholder="Nome, CRM, RQE ou especialidade"><button class="secondary-button" id="doctor-search">Buscar</button></div>
      <div id="doctor-results">${loading()}</div>
    </article>`;
  const results=target.querySelector('#doctor-results');
  const load=async()=>{
    try{
      const doctors=await doctorApi.search(target.querySelector('#doctor-q').value);
      results.innerHTML=doctors.length?`<div class="cards">${doctors.map(d=>`
        <article class="card"><div class="panel-header"><h3>${escapeHtml(d.fullName)}</h3>${badge(d.status,toneForStatus(d.status))}</div><p>CRM ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</p><p>${escapeHtml(d.rqe||'RQE não informado')}</p><p>${escapeHtml(d.modality)}</p><button class="secondary-button" data-doctor="${d.id}">Ver disponibilidade</button></article>`).join('')}</div>`:empty();
      results.querySelectorAll('[data-doctor]').forEach(btn=>btn.addEventListener('click',()=>showDoctorAvailability(btn.dataset.doctor)));
    }catch(err){renderError(results,err);}
  };
  target.querySelector('#doctor-search').addEventListener('click',load);
  target.querySelector('#new-doctor')?.addEventListener('click',()=>openDoctorModal(load));
  await load();
}

async function showDoctorAvailability(id) {
  try{
    const list=await doctorApi.availability(id);
    openModal('Disponibilidade médica', list.length?`<div class="table-wrap"><table><thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th>Slot</th></tr></thead><tbody>${list.map(v=>`<tr><td>${v.weekday}</td><td>${escapeHtml(v.startsAt)}</td><td>${escapeHtml(v.endsAt)}</td><td>${v.slotMinutes} min</td></tr>`).join('')}</tbody></table></div>`:empty(),()=>{});
  }catch(err){showToast(err.message,'error');}
}

function openDoctorModal(onSaved) {
  openModal('Novo médico', `
    <form id="doctor-form" class="form-grid two">
      <label>Nome<input name="fullName" required></label><label>CPF<input name="cpf"></label>
      <label>CRM<input name="crm" required></label><label>UF CRM<input name="crmState" required maxlength="2"></label>
      <label>RQE<input name="rqe"></label><label>Telefone<input name="phone"></label>
      <label>E-mail<input name="email" type="email"></label>
      <label>Status<select name="status"><option>ACTIVE</option><option>INACTIVE</option><option>AWAY</option></select></label>
      <label>Duração padrão<input name="defaultAppointmentMinutes" type="number" value="30" min="5" max="480"></label>
      <label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option><option>HIBRIDO</option></select></label>
      <div class="form-actions"><button class="primary-button">Cadastrar médico</button></div>
    </form>`, modal=>{
      modal.querySelector('#doctor-form').addEventListener('submit',async e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());body.defaultAppointmentMinutes=Number(body.defaultAppointmentMinutes);
        try{await doctorApi.create(body);closeModal();showToast('Médico cadastrado.','success');await onSaved();}catch(err){showToast(err.message,'error');}
      });
    });
}

function appointmentTable(items) {
  return `<div class="table-wrap"><table><thead><tr><th>Horário</th><th>Paciente</th><th>Médico</th><th>Status</th><th>Ações</th></tr></thead><tbody>${items.map(a=>`
    <tr><td>${formatDateTime(a.startsAt)}</td><td>${escapeHtml(a.patientId)}</td><td>${escapeHtml(a.doctorId)}</td><td>${badge(a.status,toneForStatus(a.status))}</td>
    <td><div class="toolbar"><button class="secondary-button" data-select-appointment="${a.id}">Selecionar</button>${session.hasAnyRole('RECEPCAO','ADMIN')?transitionButtons(a):''}</div></td></tr>`).join('')}</tbody></table></div>`;
}
function transitionButtons(a){
  const map={SCHEDULED:['CONFIRMED','CHECKED_IN','CANCELLED','NO_SHOW'],CONFIRMED:['CHECKED_IN','CANCELLED','NO_SHOW'],CHECKED_IN:['CANCELLED']};
  return (map[a.status]||[]).map(s=>`<button class="ghost-button" data-transition="${a.id}|${s}">${s}</button>`).join('');
}

async function renderAgenda(target) {
  const [todayStart,todayEnd]=localDayRange();
  target.innerHTML=`
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Operação</p><h2>Agenda</h2></div>${session.hasAnyRole('RECEPCAO','ADMIN')?'<button class="primary-button" id="new-appointment">+ Agendar</button>':''}</div>
      <div class="filters"><input id="agenda-from" type="datetime-local"><input id="agenda-to" type="datetime-local"><button class="secondary-button" id="agenda-load">Carregar</button></div>
      <div id="agenda-results">${loading()}</div>
    </article>
    ${session.hasAnyRole('RECEPCAO','ADMIN')?'<article class="panel"><div class="panel-header"><h2>Fila de espera</h2><button class="secondary-button" id="new-wait">Adicionar</button></div><div id="wait-results"></div></article>':''}`;
  const asLocal=v=>{const d=new Date(v);const z=d.getTimezoneOffset();return new Date(d.getTime()-z*60000).toISOString().slice(0,16)};
  target.querySelector('#agenda-from').value=asLocal(todayStart);
  target.querySelector('#agenda-to').value=asLocal(todayEnd);
  const load=async()=>{
    const from=new Date(target.querySelector('#agenda-from').value).toISOString();
    const to=new Date(target.querySelector('#agenda-to').value).toISOString();
    const box=target.querySelector('#agenda-results');box.innerHTML=loading();
    try{
      const items=await appointmentApi.list(from,to);
      box.innerHTML=items.length?appointmentTable(items):empty();
      box.querySelectorAll('[data-select-appointment]').forEach(btn=>btn.addEventListener('click',()=>{selectedAppointmentId=btn.dataset.selectAppointment;showToast('Agendamento selecionado.');}));
      box.querySelectorAll('[data-transition]').forEach(btn=>btn.addEventListener('click',async()=>{
        const [id,status]=btn.dataset.transition.split('|');
        let reason=null;if(status==='CANCELLED') reason=prompt('Motivo do cancelamento:');if(status==='CANCELLED'&&!reason)return;
        try{await appointmentApi.transition(id,status,reason);showToast('Status atualizado.','success');await load();}catch(err){showToast(err.message,'error');}
      }));
    }catch(err){renderError(box,err);}
  };
  target.querySelector('#agenda-load').addEventListener('click',load);
  target.querySelector('#new-appointment')?.addEventListener('click',()=>openAppointmentModal(load));
  if(target.querySelector('#wait-results')){
    const loadWait=async()=>{const box=target.querySelector('#wait-results');try{const items=await waitlistApi.list();box.innerHTML=items.length?`<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Prioridade</th><th>Preferência</th><th>Status</th></tr></thead><tbody>${items.map(w=>`<tr><td>${escapeHtml(w.patientId)}</td><td>${w.priority}</td><td>${formatDateTime(w.preferredFrom)} — ${formatDateTime(w.preferredTo)}</td><td>${badge(w.status,toneForStatus(w.status))}</td></tr>`).join('')}</tbody></table></div>`:empty();}catch(err){renderError(box,err);}};
    target.querySelector('#new-wait').addEventListener('click',()=>openWaitlistModal(loadWait));await loadWait();
  }
  await load();
}

function openAppointmentModal(onSaved){
  Promise.all([patientApi.search('',100),doctorApi.search('',100)]).then(([patients,doctors])=>{
    openModal('Novo agendamento',`
      <form id="appointment-form" class="form-grid two">
        <label>Paciente<select name="patientId" required><option value="">Selecione</option>${patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></label>
        <label>Médico<select name="doctorId" required><option value="">Selecione</option>${doctors.map(d=>`<option value="${d.id}">${escapeHtml(d.fullName)} — ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</option>`).join('')}</select></label>
        <label>Data/hora<input name="startsAt" type="datetime-local" required></label>
        <label>Duração (min)<input name="durationMinutes" type="number" value="30"></label>
        <label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option><option>HIBRIDO</option></select></label>
        <label>Observação<input name="notes"></label>
        <div class="form-actions"><button class="primary-button">Agendar</button></div>
      </form>`,modal=>modal.querySelector('#appointment-form').addEventListener('submit',async e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());body.startsAt=new Date(body.startsAt).toISOString();body.durationMinutes=Number(body.durationMinutes);
        try{await appointmentApi.create(body);closeModal();showToast('Agendamento criado.','success');await onSaved();}catch(err){showToast(err.message,'error');}
      }));
  }).catch(err=>showToast(err.message,'error'));
}

function openWaitlistModal(onSaved){
  Promise.all([patientApi.search('',100),doctorApi.search('',100),doctorApi.specialties()]).then(([patients,doctors,specialties])=>{
    openModal('Adicionar à fila de espera',`
      <form id="wait-form" class="form-grid two">
        <label>Paciente<select name="patientId" required>${patients.map(p=>`<option value="${p.id}">${escapeHtml(p.fullName)}</option>`).join('')}</select></label>
        <label>Médico<select name="doctorId"><option value="">Qualquer</option>${doctors.map(d=>`<option value="${d.id}">${escapeHtml(d.fullName)}</option>`).join('')}</select></label>
        <label>Especialidade<select name="specialtyId"><option value="">Qualquer</option>${specialties.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></label>
        <label>Prioridade<input name="priority" type="number" min="0" max="100" value="0"></label>
        <label>A partir de<input name="preferredFrom" type="datetime-local"></label>
        <label>Até<input name="preferredTo" type="datetime-local"></label>
        <div class="form-actions"><button class="primary-button">Adicionar</button></div>
      </form>`,modal=>modal.querySelector('#wait-form').addEventListener('submit',async e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);const b=Object.fromEntries(f.entries());b.priority=Number(b.priority);b.doctorId=b.doctorId||null;b.specialtyId=b.specialtyId||null;b.preferredFrom=b.preferredFrom?new Date(b.preferredFrom).toISOString():null;b.preferredTo=b.preferredTo?new Date(b.preferredTo).toISOString():null;
        try{await waitlistApi.create(b);closeModal();showToast('Paciente adicionado à fila.','success');await onSaved();}catch(err){showToast(err.message,'error');}
      }));
  });
}

async function renderClinical(target){
  target.innerHTML=`
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Segurança clínica</p><h2>Prontuário longitudinal</h2></div></div>
      <div class="filters"><input id="clinical-patient" placeholder="UUID do paciente" value="${escapeHtml(selectedPatientId||'')}"><button class="secondary-button" id="clinical-open">Abrir prontuário</button></div>
      <div id="clinical-result">${selectedPatientId?loading():'<div class="state-card"><p>Selecione um paciente na tela Pacientes ou informe o UUID.</p></div>'}</div>
    </article>
    <article class="panel">
      <div class="panel-header"><h2>Atendimento</h2></div>
      <div class="filters"><input id="encounter-appointment" placeholder="UUID do agendamento" value="${escapeHtml(selectedAppointmentId||'')}"><button class="primary-button" id="encounter-start">Iniciar atendimento</button></div>
      <div id="encounter-box">${activeEncounter?encounterForm(activeEncounter):empty('Nenhum atendimento ativo nesta sessão.')}</div>
    </article>`;
  const open=async()=>{
    selectedPatientId=target.querySelector('#clinical-patient').value.trim();
    const box=target.querySelector('#clinical-result');box.innerHTML=loading();
    try{
      const [snap,timeline,docs]=await Promise.all([clinicalApi.snapshot(selectedPatientId),clinicalApi.timeline(selectedPatientId),clinicalApi.documents(selectedPatientId)]);
      box.innerHTML=`
        ${snap.alerts?.length?snap.alerts.map(a=>`<div class="alert ${a.severity==='CRITICAL'?'danger':'warning'}"><strong>${escapeHtml(a.severity)} — ${escapeHtml(a.type)}</strong><p>${escapeHtml(a.message)}</p></div>`).join(''):''}
        <div class="three-columns">
          <article class="card"><h3>Alergias</h3>${snap.allergies?.length?snap.allergies.map(a=>`<p><strong>${escapeHtml(a.substance)}</strong> — ${escapeHtml(a.reaction||'')} ${badge(a.severity,toneForStatus(a.severity))}</p>`).join(''):'<p>Nenhuma ativa.</p>'}</article>
          <article class="card"><h3>Medicamentos</h3>${snap.medications?.length?snap.medications.map(m=>`<p>${escapeHtml(m.name)} ${escapeHtml(m.dosage||'')} ${escapeHtml(m.frequency||'')}</p>`).join(''):'<p>Nenhum ativo.</p>'}</article>
          <article class="card"><h3>Condições</h3>${snap.conditions?.length?snap.conditions.map(c=>`<p>${escapeHtml(c.description)} — ${escapeHtml(c.status)}</p>`).join(''):'<p>Nenhuma ativa.</p>'}</article>
        </div>
        <div class="two-columns">
          <article class="card"><h3>Linha do tempo</h3><div class="timeline">${timeline.map(t=>`<div class="timeline-item"><strong>${escapeHtml(t.type)}</strong><p>${escapeHtml(t.title)}</p><small>${formatDateTime(t.occurredAt)}</small></div>`).join('')||'<p>Sem eventos.</p>'}</div></article>
          <article class="card"><h3>Documentos</h3>${docs.map(d=>`<p>${escapeHtml(d.documentType)} · ${escapeHtml(d.mimeType)}</p>`).join('')||'<p>Sem documentos.</p>'}</article>
        </div>
        <div class="toolbar"><button class="secondary-button" id="add-allergy">+ Alergia</button><button class="secondary-button" id="add-med">+ Medicamento</button><button class="secondary-button" id="add-condition">+ Condição</button></div>`;
      box.querySelector('#add-allergy')?.addEventListener('click',()=>quickClinicalEntry('Alergia',[
        ['substance','Substância'],['reaction','Reação'],['severity','Severidade (LOW/MEDIUM/HIGH/CRITICAL)']
      ],body=>clinicalApi.addAllergy(selectedPatientId,body),open));
      box.querySelector('#add-med')?.addEventListener('click',()=>quickClinicalEntry('Medicamento',[
        ['name','Nome'],['dosage','Dose'],['frequency','Frequência']
      ],body=>clinicalApi.addMedication(selectedPatientId,body),open));
      box.querySelector('#add-condition')?.addEventListener('click',()=>quickClinicalEntry('Condição',[
        ['description','Descrição'],['status','Status (ACTIVE/CONTROLLED/RESOLVED)']
      ],body=>clinicalApi.addCondition(selectedPatientId,body),open));
    }catch(err){renderError(box,err);}
  };
  target.querySelector('#clinical-open').addEventListener('click',open);
  target.querySelector('#encounter-start').addEventListener('click',async()=>{
    const appointmentId=target.querySelector('#encounter-appointment').value.trim();
    try{activeEncounter=await clinicalApi.startEncounter(appointmentId);selectedAppointmentId=appointmentId;target.querySelector('#encounter-box').innerHTML=encounterForm(activeEncounter);wireEncounter(target.querySelector('#encounter-box'));showToast('Atendimento iniciado.','success');}catch(err){showToast(err.message,'error');}
  });
  if(activeEncounter) wireEncounter(target.querySelector('#encounter-box'));
  if(selectedPatientId) await open();
}

function encounterForm(e){
  return `<form id="encounter-form" class="form-grid">
    <label>Queixa principal<textarea name="chiefComplaint">${escapeHtml(e.chiefComplaint||'')}</textarea></label>
    <label>Avaliação<textarea name="assessment">${escapeHtml(e.assessment||'')}</textarea></label>
    <label>Plano/conduta<textarea name="plan">${escapeHtml(e.plan||'')}</textarea></label>
    <div class="form-actions"><button type="button" class="secondary-button" id="save-draft">Salvar rascunho</button><button type="button" class="primary-button" id="finalize-encounter">Finalizar atendimento</button></div>
  </form>`;
}
function wireEncounter(box){
  box.querySelector('#save-draft')?.addEventListener('click',async()=>{
    const f=new FormData(box.querySelector('#encounter-form'));try{activeEncounter=await clinicalApi.saveDraft(activeEncounter.id,{...Object.fromEntries(f.entries()),version:activeEncounter.version});box.innerHTML=encounterForm(activeEncounter);wireEncounter(box);showToast('Rascunho salvo.','success');}catch(err){showToast(err.message,'error');}
  });
  box.querySelector('#finalize-encounter')?.addEventListener('click',async()=>{
    try{activeEncounter=await clinicalApi.finalize(activeEncounter.id,activeEncounter.version);box.innerHTML='<div class="state-card"><strong>Atendimento finalizado.</strong><p>O registro original agora é imutável; correções devem ser feitas por adendo.</p></div>';showToast('Atendimento finalizado.','success');}catch(err){showToast(err.message,'error');}
  });
}
function quickClinicalEntry(title,fields,submit,onSaved){
  openModal('Registrar '+title,`<form id="quick-form" class="form-grid">${fields.map(([name,label])=>`<label>${label}<input name="${name}" required></label>`).join('')}<div class="form-actions"><button class="primary-button">Salvar</button></div></form>`,modal=>{
    modal.querySelector('#quick-form').addEventListener('submit',async e=>{e.preventDefault();try{await submit(Object.fromEntries(new FormData(e.currentTarget).entries()));closeModal();showToast(title+' registrado.','success');await onSaved();}catch(err){showToast(err.message,'error');}});
  });
}

async function renderContinuity(target){
  target.innerHTML=`<div class="two-columns"><article class="panel"><div class="panel-header"><h2>Exames pendentes</h2></div><div id="exam-box">${loading()}</div></article><article class="panel"><div class="panel-header"><h2>Acompanhamentos</h2></div><div id="follow-box">${loading()}</div></article></div>`;
  const examBox=target.querySelector('#exam-box'), followBox=target.querySelector('#follow-box');
  try{
    if(session.hasAnyRole('MEDICO','ADMIN')){
      const exams=await continuityApi.pendingExams();
      examBox.innerHTML=exams.length?`<div class="table-wrap"><table><thead><tr><th>Exame</th><th>Prioridade</th><th>Status</th><th>Prazo</th></tr></thead><tbody>${exams.map(e=>`<tr><td>${escapeHtml(e.examName)}</td><td>${escapeHtml(e.priority)}</td><td>${badge(e.status,toneForStatus(e.status))}</td><td>${formatDate(e.expectedBy)}</td></tr>`).join('')}</tbody></table></div>`:empty();
    }else examBox.innerHTML='<div class="state-card"><p>Exames clínicos são exibidos somente ao perfil médico.</p></div>';
    const follows=await continuityApi.followUps();
    followBox.innerHTML=follows.length?`<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th></th></tr></thead><tbody>${follows.map(f=>`<tr><td>${escapeHtml(f.patientName)}</td><td>${escapeHtml(f.priority)}</td><td>${badge(f.status,toneForStatus(f.status))}</td><td>${formatDateTime(f.dueAt)}</td><td><button class="secondary-button" data-follow="${f.id}">Registrar ação</button></td></tr>`).join('')}</tbody></table></div>`:empty();
    followBox.querySelectorAll('[data-follow]').forEach(btn=>btn.addEventListener('click',()=>openFollowAction(btn.dataset.follow,()=>renderContinuity(target))));
  }catch(err){renderError(followBox,err);}
}
function openFollowAction(id,onSaved){
  openModal('Ação de acompanhamento',`<form id="follow-form" class="form-grid"><label>Tipo<input name="actionType" required placeholder="CONTACT_ATTEMPT"></label><label>Nota<textarea name="note"></textarea></label><label><span>Concluir acompanhamento</span><select name="close"><option value="false">Não</option><option value="true">Sim</option></select></label><div class="form-actions"><button class="primary-button">Registrar</button></div></form>`,modal=>modal.querySelector('#follow-form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());b.close=b.close==='true';try{await continuityApi.addFollowUpAction(id,b);closeModal();showToast('Ação registrada.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}

async function renderFinance(target){
  const [from,to]=monthRange();
  target.innerHTML=`<article class="panel"><div class="panel-header"><h2>Recebíveis</h2></div><div class="filters"><input id="fin-from" type="date" value="${from}"><input id="fin-to" type="date" value="${to}"><button class="secondary-button" id="fin-load">Carregar</button></div><div id="fin-results">${loading()}</div></article>`;
  const load=async()=>{const box=target.querySelector('#fin-results');try{const rows=await financeApi.list(target.querySelector('#fin-from').value,target.querySelector('#fin-to').value);box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Atendimento</th><th>Pagador</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.encounterId)}</td><td>${escapeHtml(r.payerType)}</td><td>${formatMoney(r.amount)}</td><td>${formatDate(r.dueDate)}</td><td>${badge(r.status,toneForStatus(r.status))}</td></tr>`).join('')}</tbody></table></div>`:empty();}catch(err){renderError(box,err);}};
  target.querySelector('#fin-load').addEventListener('click',load);await load();
}

async function renderAdmin(target){
  target.innerHTML=`
    <div class="two-columns">
      <article class="panel"><div class="panel-header"><h2>Novo usuário</h2></div>
        <form id="user-form" class="form-grid"><label>Usuário<input name="username" required></label><label>Senha inicial<input name="password" type="password" minlength="12" required></label><label>Perfis<input name="roles" placeholder="MEDICO,ADMIN" required></label><button class="primary-button">Criar usuário</button></form>
      </article>
      <article class="panel"><div class="panel-header"><h2>Auditoria</h2></div><div class="filters"><input id="audit-type" placeholder="Tipo de entidade"><input id="audit-id" placeholder="ID da entidade"><button class="secondary-button" id="audit-load">Consultar</button></div><div id="audit-results"></div></article>
    </div>`;
  target.querySelector('#user-form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await adminApi.createUser({username:f.get('username'),password:f.get('password'),roles:f.get('roles').split(',').map(x=>x.trim()).filter(Boolean)});e.currentTarget.reset();showToast('Usuário criado.','success');}catch(err){showToast(err.message,'error');}});
  const load=async()=>{const box=target.querySelector('#audit-results');box.innerHTML=loading();try{const rows=await adminApi.audit(target.querySelector('#audit-type').value,target.querySelector('#audit-id').value);box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Correlação</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.occurredAt)}</td><td>${escapeHtml(r.username||'sistema')}</td><td>${escapeHtml(r.action)}</td><td>${escapeHtml(r.entityType)} / ${escapeHtml(r.entityId||'')}</td><td>${escapeHtml(r.correlationId||'')}</td></tr>`).join('')}</tbody></table></div>`:empty();}catch(err){renderError(box,err);}};
  target.querySelector('#audit-load').addEventListener('click',load);await load();
}

function openModal(title,content,onReady){
  const el=document.createElement('div');el.className='modal';el.id='active-modal';el.innerHTML=`<div class="modal-card"><div class="panel-header"><h2>${escapeHtml(title)}</h2><button class="ghost-button" id="modal-close">Fechar</button></div>${content}</div>`;document.body.appendChild(el);
  el.querySelector('#modal-close').addEventListener('click',closeModal);el.addEventListener('click',e=>{if(e.target===el)closeModal();});onReady?.(el);
}
function closeModal(){document.getElementById('active-modal')?.remove();}

window.addEventListener('hashchange',render);
if(!location.hash) location.hash=session.get()?'#/dashboard':'#/login';
render();
