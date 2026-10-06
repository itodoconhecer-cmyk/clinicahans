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


async function renderPatientsFull(target) {
  target.innerHTML = `
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Cadastro</p><h2>Pacientes</h2></div>${session.hasAnyRole('RECEPCAO','ADMIN')?'<button class="primary-button" id="new-patient-full">+ Novo paciente</button>':''}</div>
      <div class="filters"><input id="patient-full-q" placeholder="Buscar por nome, CPF ou telefone"><button class="secondary-button" id="patient-full-search">Buscar</button></div>
      <div id="patient-full-results">${loading()}</div>
    </article>`;
  const box=target.querySelector('#patient-full-results');
  const load=async()=>{
    box.innerHTML=loading();
    try{
      const rows=await patientApi.search(target.querySelector('#patient-full-q').value,100);
      box.innerHTML=rows.length?`<div class="cards">${rows.map(p=>`
        <article class="card"><h3>${escapeHtml(p.fullName)}</h3><p>${escapeHtml(p.cpf||'CPF não informado')}</p><p>${escapeHtml(p.phone||'Telefone não informado')}</p>
        <div class="toolbar"><button class="secondary-button" data-patient-detail="${p.id}">Ficha</button>${session.hasAnyRole('MEDICO','ADMIN')?`<button class="secondary-button" data-patient-record="${p.id}">Prontuário</button>`:''}</div></article>`).join('')}</div>`:empty();
      box.querySelectorAll('[data-patient-detail]').forEach(b=>b.addEventListener('click',()=>openPatientDetail(b.dataset.patientDetail,load)));
      box.querySelectorAll('[data-patient-record]').forEach(b=>b.addEventListener('click',()=>{selectedPatientId=b.dataset.patientRecord;navigate('clinical');}));
    }catch(err){renderError(box,err);}
  };
  target.querySelector('#patient-full-search').addEventListener('click',load);
  target.querySelector('#new-patient-full')?.addEventListener('click',()=>openPatientModal(load));
  await load();
}

async function openPatientDetail(id,onUpdated){
  try{
    const p=await patientApi.get(id);
    const editable=session.hasAnyRole('RECEPCAO','ADMIN');
    openModal('Ficha administrativa do paciente',`
      <form id="patient-detail-form" class="form-grid two">
        <label>Nome completo<input name="fullName" value="${escapeHtml(p.fullName)}" ${editable?'':'disabled'}></label>
        <label>CPF<input value="${escapeHtml(p.cpf||'')}" disabled></label>
        <label>Nascimento<input value="${formatDate(p.birthDate)}" disabled></label>
        <label>Telefone<input name="phone" value="${escapeHtml(p.phone||'')}" ${editable?'':'disabled'}></label>
        <label>E-mail<input name="email" value="${escapeHtml(p.email||'')}" ${editable?'':'disabled'}></label>
        <label>Status<input value="${escapeHtml(p.status)}" disabled></label>
        ${editable?'<div class="form-actions"><button class="primary-button">Salvar alterações</button></div>':''}
      </form>`,modal=>{
        if(editable) modal.querySelector('#patient-detail-form').addEventListener('submit',async e=>{
          e.preventDefault();const fd=new FormData(e.currentTarget);
          try{await patientApi.update(id,{fullName:fd.get('fullName'),phone:fd.get('phone'),email:fd.get('email'),version:p.version});closeModal();showToast('Paciente atualizado.','success');await onUpdated();}catch(err){showToast(err.message,'error');}
        });
      });
  }catch(err){showToast(err.message,'error');}
}

async function renderDoctorsFull(target){
  target.innerHTML=`
    <article class="panel">
      <div class="panel-header"><div><p class="eyebrow">Corpo clínico</p><h2>Médicos</h2></div>${session.hasAnyRole('GESTAO','ADMIN')?'<button class="primary-button" id="doctor-full-new">+ Novo médico</button>':''}</div>
      <div class="filters"><input id="doctor-full-q" placeholder="Nome, CRM, RQE ou especialidade"><button class="secondary-button" id="doctor-full-search">Buscar</button></div>
      <div id="doctor-full-results">${loading()}</div>
    </article>`;
  const box=target.querySelector('#doctor-full-results');
  const load=async()=>{
    try{
      const rows=await doctorApi.search(target.querySelector('#doctor-full-q').value,100);
      box.innerHTML=rows.length?`<div class="cards">${rows.map(d=>`
        <article class="card"><div class="panel-header"><h3>${escapeHtml(d.fullName)}</h3>${badge(d.status,toneForStatus(d.status))}</div>
        <p>CRM ${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</p><p>RQE: ${escapeHtml(d.rqe||'não informado')}</p><p>${escapeHtml(d.modality)}</p>
        <button class="secondary-button" data-doctor-detail="${d.id}">Abrir cadastro completo</button></article>`).join('')}</div>`:empty();
      box.querySelectorAll('[data-doctor-detail]').forEach(b=>b.addEventListener('click',()=>openDoctorDetail(b.dataset.doctorDetail)));
    }catch(err){renderError(box,err);}
  };
  target.querySelector('#doctor-full-search').addEventListener('click',load);
  target.querySelector('#doctor-full-new')?.addEventListener('click',()=>openDoctorModal(load));
  await load();
}

async function openDoctorDetail(id){
  try{
    const d=await doctorApi.get(id);
    const [availability,specialties]=await Promise.all([doctorApi.availability(id),doctorApi.specialties()]);
    const now=new Date(), to=new Date();to.setMonth(to.getMonth()+3);
    const blocks=await doctorApi.blocks(id,now.toISOString(),to.toISOString());
    openModal('Cadastro completo do médico',`
      <div class="metric-grid">
        <article class="metric-card"><span>Status</span><strong>${escapeHtml(d.status)}</strong><small>${escapeHtml(d.modality)}</small></article>
        <article class="metric-card"><span>CRM</span><strong>${escapeHtml(d.crm)}/${escapeHtml(d.crmState)}</strong><small>RQE ${escapeHtml(d.rqe||'—')}</small></article>
      </div>
      <div class="two-columns">
        <article class="card"><h3>Dados profissionais</h3><p><strong>${escapeHtml(d.fullName)}</strong></p><p>${escapeHtml(d.email||'')}</p><p>${escapeHtml(d.phone||'')}</p><p>Consulta padrão: ${d.defaultAppointmentMinutes} min</p></article>
        <article class="card"><h3>Identidade digital</h3><p>User ID: ${escapeHtml(d.userId||'não vinculado')}</p>${session.hasRole('ADMIN')?'<button class="secondary-button" id="doctor-link-user">Vincular usuário</button>':''}</article>
      </div>
      <article class="panel"><div class="panel-header"><h3>Disponibilidade</h3>${session.hasAnyRole('GESTAO','ADMIN')?'<button class="secondary-button" id="doctor-add-av">Adicionar faixa</button>':''}</div>
        ${availability.length?`<div class="table-wrap"><table><thead><tr><th>Dia</th><th>Início</th><th>Fim</th><th>Slot</th></tr></thead><tbody>${availability.map(v=>`<tr><td>${v.weekday}</td><td>${escapeHtml(v.startsAt)}</td><td>${escapeHtml(v.endsAt)}</td><td>${v.slotMinutes} min</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma disponibilidade cadastrada.')}
      </article>
      <article class="panel"><div class="panel-header"><h3>Bloqueios próximos</h3>${session.hasAnyRole('GESTAO','ADMIN')?'<button class="secondary-button" id="doctor-add-block">Novo bloqueio</button>':''}</div>
        ${blocks.length?`<div class="table-wrap"><table><thead><tr><th>Início</th><th>Fim</th><th>Motivo</th></tr></thead><tbody>${blocks.map(b=>`<tr><td>${formatDateTime(b.startsAt)}</td><td>${formatDateTime(b.endsAt)}</td><td>${escapeHtml(b.reason||'')}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhum bloqueio próximo.')}
      </article>
      ${session.hasAnyRole('GESTAO','ADMIN')?`<article class="panel"><div class="panel-header"><h3>Especialidades</h3><button class="secondary-button" id="doctor-link-specialty">Vincular especialidade</button></div><p>O vínculo é administrado a partir do catálogo cadastrado.</p></article>`:''}
    `,modal=>{
      modal.querySelector('#doctor-add-av')?.addEventListener('click',()=>openAvailabilityForm(id,()=>{closeModal();openDoctorDetail(id);}));
      modal.querySelector('#doctor-add-block')?.addEventListener('click',()=>openBlockForm(id,()=>{closeModal();openDoctorDetail(id);}));
      modal.querySelector('#doctor-link-specialty')?.addEventListener('click',()=>openSpecialtyLinkForm(id,specialties,()=>{closeModal();openDoctorDetail(id);}));
      modal.querySelector('#doctor-link-user')?.addEventListener('click',()=>openUserLinkForm(id,()=>{closeModal();openDoctorDetail(id);}));
    });
  }catch(err){showToast(err.message,'error');}
}

function openAvailabilityForm(id,onSaved){
  openModal('Adicionar disponibilidade',`<form id="av-form" class="form-grid two"><label>Dia da semana (1-7)<input name="weekday" type="number" min="1" max="7" required></label><label>Início<input name="startsAt" type="time" required></label><label>Fim<input name="endsAt" type="time" required></label><label>Slot (min)<input name="slotMinutes" type="number" value="30" min="5" required></label><div class="form-actions"><button class="primary-button">Salvar</button></div></form>`,modal=>modal.querySelector('#av-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.weekday=Number(x.weekday);x.slotMinutes=Number(x.slotMinutes);try{await doctorApi.addAvailability(id,x);closeModal();showToast('Disponibilidade adicionada.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}
function openBlockForm(id,onSaved){
  openModal('Novo bloqueio de agenda',`<form id="block-form" class="form-grid"><label>Início<input name="startsAt" type="datetime-local" required></label><label>Fim<input name="endsAt" type="datetime-local" required></label><label>Motivo<input name="reason"></label><div class="form-actions"><button class="primary-button">Bloquear agenda</button></div></form>`,modal=>modal.querySelector('#block-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.startsAt=new Date(x.startsAt).toISOString();x.endsAt=new Date(x.endsAt).toISOString();try{await doctorApi.addBlock(id,x);closeModal();showToast('Bloqueio criado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}
function openSpecialtyLinkForm(id,specialties,onSaved){
  openModal('Vincular especialidade',`<form id="spec-link-form" class="form-grid"><label>Especialidade<select name="specialtyId">${specialties.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></label><label>Principal<select name="primary"><option value="false">Não</option><option value="true">Sim</option></select></label><div class="form-actions"><button class="primary-button">Vincular</button></div></form>`,modal=>modal.querySelector('#spec-link-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await doctorApi.linkSpecialty(id,fd.get('specialtyId'),fd.get('primary')==='true');closeModal();showToast('Especialidade vinculada.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}
async function openUserLinkForm(id,onSaved){
  try{
    const users=await adminApi.users();
    openModal('Vincular usuário ao médico',`<form id="user-link-form" class="form-grid"><label>Usuário<select name="userId">${users.filter(u=>u.active).map(u=>`<option value="${u.id}">${escapeHtml(u.username)} — ${escapeHtml((u.roles||[]).join(', '))}</option>`).join('')}</select></label><div class="form-actions"><button class="primary-button">Vincular</button></div></form>`,modal=>modal.querySelector('#user-link-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await doctorApi.linkUser(id,fd.get('userId'));closeModal();showToast('Usuário vinculado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
  }catch(err){showToast(err.message,'error');}
}

async function renderSpecialties(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Corpo clínico</p><h2>Especialidades</h2></div><button class="primary-button" id="new-specialty">+ Nova especialidade</button></div><div id="specialty-list">${loading()}</div></article>`;
  const box=target.querySelector('#specialty-list');
  const load=async()=>{try{const rows=await doctorApi.specialties();box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Especialidade</th><th>Sistema externo</th><th>Código</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.externalSystem||'—')}</td><td>${escapeHtml(s.externalCode||'—')}</td></tr>`).join('')}</tbody></table></div>`:empty();}catch(err){renderError(box,err);}};
  target.querySelector('#new-specialty').addEventListener('click',()=>openModal('Nova especialidade',`<form id="specialty-form" class="form-grid"><label>Nome<input name="name" required></label><label>Sistema externo<input name="externalSystem"></label><label>Código externo<input name="externalCode"></label><div class="form-actions"><button class="primary-button">Cadastrar</button></div></form>`,modal=>modal.querySelector('#specialty-form').addEventListener('submit',async e=>{e.preventDefault();try{await doctorApi.createSpecialty(Object.fromEntries(new FormData(e.currentTarget).entries()));closeModal();showToast('Especialidade cadastrada.','success');await load();}catch(err){showToast(err.message,'error');}})));
  await load();
}

async function renderWaitlist(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Capacidade</p><h2>Fila de espera e repescagem</h2></div><button class="primary-button" id="wait-new">+ Adicionar paciente</button></div><div id="wait-list">${loading()}</div></article>`;
  const box=target.querySelector('#wait-list');
  const load=async()=>{try{const rows=await waitlistApi.list();box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Médico</th><th>Especialidade</th><th>Preferência</th><th>Prioridade</th><th>Ação</th></tr></thead><tbody>${rows.map(w=>`<tr><td>${escapeHtml(w.patientId)}</td><td>${escapeHtml(w.doctorId||'qualquer')}</td><td>${escapeHtml(w.specialtyId||'qualquer')}</td><td>${formatDateTime(w.preferredFrom)} — ${formatDateTime(w.preferredTo)}</td><td>${w.priority}</td><td><button class="secondary-button" data-wait-convert="${w.id}">Converter em consulta</button></td></tr>`).join('')}</tbody></table></div>`:empty();box.querySelectorAll('[data-wait-convert]').forEach(b=>b.addEventListener('click',()=>openWaitConvert(b.dataset.waitConvert,load)));}catch(err){renderError(box,err);}};
  target.querySelector('#wait-new').addEventListener('click',()=>openWaitlistModal(load));await load();
}
function openWaitConvert(id,onSaved){
  doctorApi.search('',100).then(doctors=>openModal('Converter fila em agendamento',`<form id="wait-convert-form" class="form-grid"><label>Médico<select name="doctorId"><option value="">Usar preferência da fila</option>${doctors.map(d=>`<option value="${d.id}">${escapeHtml(d.fullName)}</option>`).join('')}</select></label><label>Data/hora<input name="startsAt" type="datetime-local" required></label><label>Duração<input name="durationMinutes" type="number" value="30"></label><label>Modalidade<select name="modality"><option>PRESENCIAL</option><option>TELEMEDICINA</option><option>HIBRIDO</option></select></label><div class="form-actions"><button class="primary-button">Agendar e retirar da fila</button></div></form>`,modal=>modal.querySelector('#wait-convert-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.doctorId=x.doctorId||null;x.startsAt=new Date(x.startsAt).toISOString();x.durationMinutes=Number(x.durationMinutes);try{await waitlistApi.convert(id,x);closeModal();showToast('Repescagem concluída.','success');await onSaved();}catch(err){showToast(err.message,'error');}}))).catch(err=>showToast(err.message,'error'));
}

async function renderClinicalFull(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Prontuário longitudinal</p><h2>Safety snapshot e histórico</h2></div><button class="secondary-button" id="go-encounter">Ir para atendimento</button></div><div class="filters"><input id="record-patient" placeholder="UUID do paciente" value="${escapeHtml(selectedPatientId||'')}"><button class="primary-button" id="record-open">Abrir prontuário</button></div><div id="record-box">${selectedPatientId?loading():empty('Selecione um paciente na tela Pacientes ou informe o UUID.')}</div></article>`;
  target.querySelector('#go-encounter').addEventListener('click',()=>navigate('encounter'));
  const open=async()=>{
    selectedPatientId=target.querySelector('#record-patient').value.trim();const box=target.querySelector('#record-box');box.innerHTML=loading();
    try{
      const [s,t,docs]=await Promise.all([clinicalApi.snapshot(selectedPatientId),clinicalApi.timeline(selectedPatientId),clinicalApi.documents(selectedPatientId)]);
      box.innerHTML=`
        ${(s.alerts||[]).map(a=>`<div class="alert ${a.severity==='CRITICAL'?'danger':'warning'}"><strong>${escapeHtml(a.severity)} — ${escapeHtml(a.type)}</strong><p>${escapeHtml(a.message)}</p></div>`).join('')}
        <div class="three-columns"><article class="card"><h3>Alergias</h3>${(s.allergies||[]).map(a=>`<p><strong>${escapeHtml(a.substance)}</strong> — ${escapeHtml(a.reaction||'')} ${badge(a.severity,toneForStatus(a.severity))}</p>`).join('')||'<p>Nenhuma ativa.</p>'}</article><article class="card"><h3>Medicamentos</h3>${(s.medications||[]).map(m=>`<p>${escapeHtml(m.name)} · ${escapeHtml(m.dosage||'')} · ${escapeHtml(m.frequency||'')}</p>`).join('')||'<p>Nenhum ativo.</p>'}</article><article class="card"><h3>Condições</h3>${(s.conditions||[]).map(c=>`<p>${escapeHtml(c.description)} — ${escapeHtml(c.status)}</p>`).join('')||'<p>Nenhuma ativa.</p>'}</article></div>
        <div class="toolbar"><button class="secondary-button" id="record-add-allergy">+ Alergia</button><button class="secondary-button" id="record-add-med">+ Medicamento</button><button class="secondary-button" id="record-add-condition">+ Condição</button><button class="secondary-button" id="record-add-alert">+ Alerta</button><button class="secondary-button" id="record-add-document">+ Documento</button></div>
        <div class="two-columns"><article class="panel"><h3>Linha do tempo</h3><div class="timeline">${t.map(x=>`<div class="timeline-item"><strong>${escapeHtml(x.type)}</strong><p>${escapeHtml(x.title)}</p><small>${formatDateTime(x.occurredAt)}</small></div>`).join('')||'<p>Sem eventos.</p>'}</div></article><article class="panel"><h3>Documentos</h3>${docs.map(d=>`<p><strong>${escapeHtml(d.documentType)}</strong> · ${escapeHtml(d.mimeType)}<br><small>${escapeHtml(d.storageKey)}</small></p>`).join('')||'<p>Sem documentos.</p>'}</article></div>`;
      box.querySelector('#record-add-allergy').addEventListener('click',()=>quickClinicalEntry('Alergia',[['substance','Substância'],['reaction','Reação'],['severity','Severidade (LOW/MEDIUM/HIGH/CRITICAL)']],b=>clinicalApi.addAllergy(selectedPatientId,b),open));
      box.querySelector('#record-add-med').addEventListener('click',()=>quickClinicalEntry('Medicamento',[['name','Nome'],['dosage','Dose'],['frequency','Frequência']],b=>clinicalApi.addMedication(selectedPatientId,b),open));
      box.querySelector('#record-add-condition').addEventListener('click',()=>quickClinicalEntry('Condição',[['description','Descrição'],['status','Status (ACTIVE/CONTROLLED/RESOLVED)']],b=>clinicalApi.addCondition(selectedPatientId,b),open));
      box.querySelector('#record-add-alert').addEventListener('click',()=>quickClinicalEntry('Alerta',[['type','Tipo'],['severity','Severidade (LOW/MEDIUM/HIGH/CRITICAL)'],['message','Mensagem']],b=>clinicalApi.addAlert(selectedPatientId,b),open));
      box.querySelector('#record-add-document').addEventListener('click',()=>openDocumentForm(selectedPatientId,open));
    }catch(err){renderError(box,err);}
  };
  target.querySelector('#record-open').addEventListener('click',open);if(selectedPatientId) await open();
}
function openDocumentForm(patientId,onSaved){
  openModal('Adicionar documento clínico',`<form id="doc-form" class="form-grid"><label>Atendimento (opcional)<input name="encounterId"></label><label>Tipo<input name="documentType" required></label><label>Storage key<input name="storageKey" required placeholder="exames/arquivo.pdf"></label><label>MIME type<input name="mimeType" required value="application/pdf"></label><label>Checksum<input name="checksum"></label><div class="form-actions"><button class="primary-button">Registrar documento</button></div></form>`,modal=>modal.querySelector('#doc-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.encounterId=x.encounterId||null;try{await clinicalApi.addDocument(patientId,x);closeModal();showToast('Documento registrado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}

async function renderEncounter(target){
  target.innerHTML=`
    <article class="panel"><div class="panel-header"><div><p class="eyebrow">Consulta</p><h2>Atendimento clínico</h2></div>${activeEncounter?badge(activeEncounter.status,toneForStatus(activeEncounter.status)):''}</div>
      <div class="filters"><input id="encounter-screen-appointment" placeholder="UUID do agendamento em CHECKED_IN" value="${escapeHtml(selectedAppointmentId||'')}"><button class="primary-button" id="encounter-screen-start">Iniciar atendimento</button></div>
      <div id="encounter-screen-box">${activeEncounter?encounterForm(activeEncounter):empty('Nenhum atendimento ativo nesta sessão.')}</div>
    </article>`;
  const box=target.querySelector('#encounter-screen-box');
  const wireExtras=()=>{
    wireEncounter(box);
    if(activeEncounter){
      const actions=document.createElement('div');actions.className='toolbar';actions.innerHTML='<button class="secondary-button" id="enc-exam">Solicitar exame</button><button class="secondary-button" id="enc-follow">Criar acompanhamento</button><button class="secondary-button" id="enc-addendum">Registrar adendo</button>';box.appendChild(actions);
      actions.querySelector('#enc-exam').addEventListener('click',()=>openExamCreate(activeEncounter.id,()=>showToast('Exame solicitado.','success')));
      actions.querySelector('#enc-follow').addEventListener('click',()=>openFollowCreate(activeEncounter.patientId,activeEncounter.id,()=>showToast('Acompanhamento criado.','success')));
      actions.querySelector('#enc-addendum').addEventListener('click',()=>openAddendum(activeEncounter.id));
    }
  };
  target.querySelector('#encounter-screen-start').addEventListener('click',async()=>{const id=target.querySelector('#encounter-screen-appointment').value.trim();try{activeEncounter=await clinicalApi.startEncounter(id);selectedAppointmentId=id;selectedPatientId=activeEncounter.patientId;box.innerHTML=encounterForm(activeEncounter);wireExtras();showToast('Atendimento iniciado.','success');}catch(err){showToast(err.message,'error');}});
  if(activeEncounter) wireExtras();
}
function openAddendum(encounterId){
  openModal('Adendo ao atendimento',`<form id="addendum-form" class="form-grid"><label>Motivo<textarea name="reason" required></textarea></label><label>Conteúdo<textarea name="content" required></textarea></label><div class="form-actions"><button class="primary-button">Registrar adendo</button></div></form>`,modal=>modal.querySelector('#addendum-form').addEventListener('submit',async e=>{e.preventDefault();try{await clinicalApi.addAddendum(encounterId,Object.fromEntries(new FormData(e.currentTarget).entries()));closeModal();showToast('Adendo registrado sem alterar o original.','success');}catch(err){showToast(err.message,'error');}}));
}

async function renderExams(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Continuidade</p><h2>Exames</h2></div><button class="primary-button" id="exam-new">+ Solicitar exame</button></div><div id="exam-screen-list">${loading()}</div></article>`;
  const box=target.querySelector('#exam-screen-list');
  const load=async()=>{try{const rows=await continuityApi.pendingExams();box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Exame</th><th>Paciente</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>${rows.map(e=>`<tr><td>${escapeHtml(e.examName)}</td><td>${escapeHtml(e.patientId)}</td><td>${escapeHtml(e.priority)}</td><td>${badge(e.status,toneForStatus(e.status))}</td><td>${formatDate(e.expectedBy)}</td><td><div class="toolbar">${e.status==='RESULT_RECEIVED'?`<button class="secondary-button" data-exam-review="${e.id}">Revisar</button>`:`<button class="secondary-button" data-exam-result="${e.id}">Receber resultado</button>`}</div></td></tr>`).join('')}</tbody></table></div>`:empty();
    box.querySelectorAll('[data-exam-result]').forEach(b=>b.addEventListener('click',()=>openResultReceive(b.dataset.examResult,load)));
    box.querySelectorAll('[data-exam-review]').forEach(b=>b.addEventListener('click',()=>openResultReviewByOrder(b.dataset.examReview,load)));
  }catch(err){renderError(box,err);}};
  target.querySelector('#exam-new').addEventListener('click',()=>openExamCreate(null,load));await load();
}
function openExamCreate(encounterId,onSaved){
  openModal('Solicitar exame',`<form id="exam-create-form" class="form-grid"><label>Atendimento<input name="encounterId" value="${escapeHtml(encounterId||activeEncounter?.id||'')}" required></label><label>Exame<input name="examName" required></label><label>Prioridade<select name="priority"><option>ROUTINE</option><option>HIGH</option><option>URGENT</option></select></label><label>Prazo esperado<input name="expectedBy" type="date"></label><div class="form-actions"><button class="primary-button">Solicitar</button></div></form>`,modal=>modal.querySelector('#exam-create-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.expectedBy=x.expectedBy||null;try{await continuityApi.createExam(x);closeModal();showToast('Exame solicitado.','success');await onSaved?.();}catch(err){showToast(err.message,'error');}}));
}
function openResultReceive(orderId,onSaved){
  openModal('Receber resultado',`<form id="result-form" class="form-grid"><label>Storage key<input name="storageKey" required></label><label>MIME type<input name="mimeType" value="application/pdf" required></label><div class="form-actions"><button class="primary-button">Registrar resultado</button></div></form>`,modal=>modal.querySelector('#result-form').addEventListener('submit',async e=>{e.preventDefault();try{await continuityApi.receiveResult(orderId,Object.fromEntries(new FormData(e.currentTarget).entries()));closeModal();showToast('Resultado recebido; ainda requer revisão médica.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));
}
async function openResultReviewByOrder(orderId,onSaved){
  try{const r=await continuityApi.resultForExam(orderId);openModal('Revisar resultado',`<form id="review-form" class="form-grid"><p><strong>${escapeHtml(r.storageKey)}</strong></p><label>Nota de revisão<textarea name="note"></textarea></label><div class="form-actions"><button class="primary-button">Marcar como revisado</button></div></form>`,modal=>modal.querySelector('#review-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await continuityApi.reviewResult(r.id,fd.get('note'));closeModal();showToast('Resultado revisado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));}catch(err){showToast(err.message,'error');}
}

async function renderFollowUps(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Continuidade</p><h2>Retornos e acompanhamentos</h2></div>${session.hasAnyRole('MEDICO','ADMIN')?'<button class="primary-button" id="follow-new">+ Novo acompanhamento</button>':''}</div><div id="follow-screen-list">${loading()}</div></article>`;
  const box=target.querySelector('#follow-screen-list');
  const load=async()=>{try{const rows=await continuityApi.followUps();box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Ação</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHtml(x.patientName)}</td><td>${escapeHtml(x.priority)}</td><td>${badge(x.status,toneForStatus(x.status))}</td><td>${formatDateTime(x.dueAt)}</td><td><button class="secondary-button" data-follow-action="${x.id}">Registrar ação</button></td></tr>`).join('')}</tbody></table></div>`:empty();box.querySelectorAll('[data-follow-action]').forEach(b=>b.addEventListener('click',()=>openFollowAction(b.dataset.followAction,load)));}catch(err){renderError(box,err);}};
  target.querySelector('#follow-new')?.addEventListener('click',()=>openFollowCreate(selectedPatientId,null,load));await load();
}
function openFollowCreate(patientId,encounterId,onSaved){
  openModal('Novo acompanhamento',`<form id="follow-create-form" class="form-grid"><label>Paciente<input name="patientId" value="${escapeHtml(patientId||'')}" required></label><label>Atendimento (opcional)<input name="encounterId" value="${escapeHtml(encounterId||'')}"></label><label>Motivo<textarea name="reason" required></textarea></label><label>Prioridade<select name="priority"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label>Prazo<input name="dueAt" type="datetime-local"></label><div class="form-actions"><button class="primary-button">Criar acompanhamento</button></div></form>`,modal=>modal.querySelector('#follow-create-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.encounterId=x.encounterId||null;x.dueAt=x.dueAt?new Date(x.dueAt).toISOString():null;try{await continuityApi.createFollowUp(x);closeModal();showToast('Acompanhamento criado.','success');await onSaved?.();}catch(err){showToast(err.message,'error');}}));
}

async function renderFinanceFull(target){
  const [from,to]=monthRange();
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Financeiro</p><h2>Faturamento e recebimentos</h2></div><button class="primary-button" id="receivable-new">+ Novo recebível</button></div><div class="filters"><input id="finance-from" type="date" value="${from}"><input id="finance-to" type="date" value="${to}"><button class="secondary-button" id="finance-load">Carregar</button></div><div id="finance-list">${loading()}</div></article>`;
  const box=target.querySelector('#finance-list');
  const load=async()=>{try{const rows=await financeApi.list(target.querySelector('#finance-from').value,target.querySelector('#finance-to').value);box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Atendimento</th><th>Pagador</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.encounterId)}</td><td>${escapeHtml(r.payerType)}</td><td>${formatMoney(r.amount)}</td><td>${formatDate(r.dueDate)}</td><td>${badge(r.status,toneForStatus(r.status))}</td><td>${r.status!=='PAID'?`<button class="secondary-button" data-payment="${r.id}">Registrar pagamento</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty();box.querySelectorAll('[data-payment]').forEach(b=>b.addEventListener('click',()=>openPayment(b.dataset.payment,load)));}catch(err){renderError(box,err);}};
  target.querySelector('#finance-load').addEventListener('click',load);target.querySelector('#receivable-new').addEventListener('click',()=>openReceivable(load));await load();
}
function openReceivable(onSaved){openModal('Novo recebível',`<form id="receivable-form" class="form-grid"><label>Atendimento finalizado<input name="encounterId" required></label><label>Pagador<select name="payerType"><option>PRIVATE</option><option>INSURANCE</option></select></label><label>Referência do pagador<input name="payerReference"></label><label>Valor<input name="amount" type="number" step="0.01" min="0" required></label><label>Vencimento<input name="dueDate" type="date"></label><div class="form-actions"><button class="primary-button">Criar recebível</button></div></form>`,modal=>modal.querySelector('#receivable-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.amount=Number(x.amount);x.dueDate=x.dueDate||null;try{await financeApi.create(x);closeModal();showToast('Recebível criado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));}
function openPayment(id,onSaved){openModal('Registrar pagamento',`<form id="payment-form" class="form-grid"><label>Valor<input name="amount" type="number" step="0.01" min="0.01" required></label><label>Forma<input name="method" required placeholder="PIX, CARD, CASH"></label><div class="form-actions"><button class="primary-button">Registrar pagamento</button></div></form>`,modal=>modal.querySelector('#payment-form').addEventListener('submit',async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(e.currentTarget).entries());x.amount=Number(x.amount);try{await financeApi.pay(id,x);closeModal();showToast('Pagamento registrado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));}

async function renderIndicators(target){
  const [from,to]=monthRange();target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Gestão</p><h2>Indicadores</h2></div></div><div class="filters"><input id="ind-from" type="date" value="${from}"><input id="ind-to" type="date" value="${to}"><button class="secondary-button" id="ind-load">Atualizar</button></div><div id="ind-box">${loading()}</div></article>`;
  const load=async()=>{const box=target.querySelector('#ind-box');try{const d=await managementApi.dashboard(target.querySelector('#ind-from').value,target.querySelector('#ind-to').value);box.innerHTML=`<div class="metric-grid"><article class="metric-card"><span>Agendamentos</span><strong>${d.appointments}</strong><small>período</small></article><article class="metric-card"><span>Ausências</span><strong>${d.noShows}</strong><small>${Number(d.noShowRate).toFixed(1)}%</small></article><article class="metric-card"><span>Cancelamentos</span><strong>${d.cancelled}</strong><small>período</small></article><article class="metric-card"><span>Recebíveis</span><strong>${formatMoney(d.grossReceivables)}</strong><small>bruto</small></article></div><div class="two-columns"><article class="panel"><h3>Continuidade</h3><p>Follow-ups abertos: <strong>${d.openFollowUps}</strong></p><p>Exames pendentes: <strong>${d.pendingExams}</strong></p></article><article class="panel"><h3>Governança</h3><p>Indicadores agregados não exibem conteúdo clínico detalhado.</p></article></div>`;}catch(err){renderError(box,err);}};
  target.querySelector('#ind-load').addEventListener('click',load);await load();
}

async function renderAdminFull(target){
  target.innerHTML=`<div class="two-columns"><article class="panel"><div class="panel-header"><h2>Usuários</h2><button class="primary-button" id="admin-user-new">+ Novo usuário</button></div><div id="admin-users">${loading()}</div></article><article class="panel"><div class="panel-header"><h2>Vínculo médico</h2></div><p>O vínculo usuário↔médico também pode ser realizado no cadastro completo do médico.</p><button class="secondary-button" id="admin-go-doctors">Abrir médicos</button></article></div>`;
  const box=target.querySelector('#admin-users');
  const load=async()=>{try{const rows=await adminApi.users();box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Usuário</th><th>Perfis</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(u=>`<tr><td>${escapeHtml(u.username)}</td><td>${escapeHtml((u.roles||[]).join(', '))}</td><td>${badge(u.active?'ACTIVE':'INACTIVE',u.active?'success':'danger')}</td><td>${u.active?`<button class="danger-button" data-user-off="${u.id}">Desativar</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty();box.querySelectorAll('[data-user-off]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Desativar este usuário?'))return;try{await adminApi.deactivateUser(b.dataset.userOff);showToast('Usuário desativado.','success');await load();}catch(err){showToast(err.message,'error');}}));}catch(err){renderError(box,err);}};
  target.querySelector('#admin-user-new').addEventListener('click',()=>openUserCreate(load));target.querySelector('#admin-go-doctors').addEventListener('click',()=>navigate('doctors'));await load();
}
function openUserCreate(onSaved){openModal('Novo usuário',`<form id="user-create-form" class="form-grid"><label>Usuário<input name="username" required></label><label>Senha inicial<input name="password" type="password" minlength="12" required></label><label>Perfis (separados por vírgula)<input name="roles" placeholder="MEDICO,ADMIN" required></label><div class="form-actions"><button class="primary-button">Criar usuário</button></div></form>`,modal=>modal.querySelector('#user-create-form').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await adminApi.createUser({username:fd.get('username'),password:fd.get('password'),roles:String(fd.get('roles')).split(',').map(x=>x.trim()).filter(Boolean)});closeModal();showToast('Usuário criado.','success');await onSaved();}catch(err){showToast(err.message,'error');}}));}

async function renderAudit(target){
  target.innerHTML=`<article class="panel"><div class="panel-header"><div><p class="eyebrow">Governança</p><h2>Auditoria</h2></div></div><div class="filters"><input id="audit-full-type" placeholder="Tipo da entidade"><input id="audit-full-id" placeholder="ID da entidade"><button class="primary-button" id="audit-full-load">Pesquisar</button></div><div id="audit-full-box">${loading()}</div></article>`;
  const box=target.querySelector('#audit-full-box');
  const load=async()=>{try{const rows=await adminApi.audit(target.querySelector('#audit-full-type').value,target.querySelector('#audit-full-id').value);box.innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th><th>Correlation ID</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.occurredAt)}</td><td>${escapeHtml(r.username||'sistema')}</td><td>${escapeHtml(r.action)}</td><td>${escapeHtml(r.entityType)}</td><td>${escapeHtml(r.entityId||'—')}</td><td><code>${escapeHtml(r.correlationId||'—')}</code></td></tr>`).join('')}</tbody></table></div>`:empty();}catch(err){renderError(box,err);}};
  target.querySelector('#audit-full-load').addEventListener('click',load);await load();
}

function openModal(title,content,onReady){
  const el=document.createElement('div');el.className='modal';el.id='active-modal';el.innerHTML=`<div class="modal-card"><div class="panel-header"><h2>${escapeHtml(title)}</h2><button class="ghost-button" id="modal-close">Fechar</button></div>${content}</div>`;document.body.appendChild(el);
  el.querySelector('#modal-close').addEventListener('click',closeModal);el.addEventListener('click',e=>{if(e.target===el)closeModal();});onReady?.(el);
}
function closeModal(){document.getElementById('active-modal')?.remove();}

window.addEventListener('hashchange',render);
if(!location.hash) location.hash=session.get()?'#/dashboard':'#/login';
render();
