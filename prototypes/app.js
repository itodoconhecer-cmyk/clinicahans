const appointments = [
  { time: '09:00', patient: 'Mariana Souza', doctor: 'Dr. Hans Chucrute', specialty: 'Clínica Médica', status: 'Confirmada' },
  { time: '10:00', patient: 'Carlos Lima', doctor: 'Dra. Paula Reis', specialty: 'Cardiologia', status: 'Em atendimento' },
  { time: '11:30', patient: 'André Martins', doctor: 'Dr. Hans Chucrute', specialty: 'Clínica Médica', status: 'Pendente' },
  { time: '14:00', patient: 'Beatriz Costa', doctor: 'Dra. Laura Nunes', specialty: 'Endocrinologia', status: 'Confirmada' },
  { time: '15:30', patient: 'Renato Alves', doctor: 'Dr. Hans Chucrute', specialty: 'Clínica Médica', status: 'Pendente' }
];

const patients = [
  { name: 'Mariana Souza', age: 46, phone: '(11) 98888-1201', flags: ['Reação medicamentosa', 'Retorno pendente'] },
  { name: 'Carlos Lima', age: 61, phone: '(11) 97771-2244', flags: ['Cardiologia'] },
  { name: 'André Martins', age: 38, phone: '(11) 96662-1030', flags: ['Exame pendente'] },
  { name: 'Beatriz Costa', age: 52, phone: '(11) 95553-8090', flags: ['Acompanhamento'] }
];

const doctors = [
  { name: 'Dr. Hans Chucrute', crm: 'CRM 184521/SP', rqe: 'RQE 92114', specialty: 'Clínica Médica', phone: '(11) 98888-4100', email: 'hans@clinicahans.com.br', schedule: 'Seg–Sex · 08h–17h', status: 'Ativo' },
  { name: 'Dra. Paula Reis', crm: 'CRM 198733/SP', rqe: 'RQE 104882', specialty: 'Cardiologia', phone: '(11) 97777-2301', email: 'paula@clinicahans.com.br', schedule: 'Ter/Qui · 09h–18h', status: 'Ativo' },
  { name: 'Dra. Laura Nunes', crm: 'CRM 176904/SP', rqe: 'RQE 88731', specialty: 'Endocrinologia', phone: '(11) 96666-5120', email: 'laura@clinicahans.com.br', schedule: 'Seg/Qua/Sex · 10h–16h', status: 'Ativo' }
];

const exams = [
  { title: 'Hemograma — Mariana Souza', detail: 'Solicitado em 12/09 · prazo sugerido 7 dias', tone: 'danger', status: 'Atrasado' },
  { title: 'Ecocardiograma — Carlos Lima', detail: 'Solicitado em 25/09', tone: 'warning', status: 'Pendente' },
  { title: 'Ultrassom — André Martins', detail: 'Resultado recebido, aguardando revisão', tone: 'success', status: 'Resultado recebido' }
];

const returns = [
  { title: 'Mariana Souza', detail: 'Retorno clínico em até 30 dias', tone: 'warning', status: 'Agendar' },
  { title: 'Carlos Lima', detail: 'Cardiologia — retorno após exame', tone: 'warning', status: 'Aguardar exame' },
  { title: 'Renato Alves', detail: 'Faltou ao retorno de 28/09', tone: 'danger', status: 'Contatar' }
];

const pageTitles = {
  dashboard: 'Visão geral', agenda: 'Agenda médica', pacientes: 'Pacientes', medicos: 'Cadastro de médicos', prontuario: 'Prontuário integrado', atendimento: 'Atendimento clínico', exames: 'Exames e retornos', financeiro: 'Faturamento', indicadores: 'Indicadores de gestão'
};

function setView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('page-title').textContent = pageTitles[view] || 'Clínica';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', event => {
  const viewTrigger = event.target.closest('[data-view]');
  if (viewTrigger) setView(viewTrigger.dataset.view);
});

function badge(status) {
  const lower = status.toLowerCase();
  const tone = lower.includes('confirm') || lower.includes('recebido') || lower.includes('pago') ? 'success' : lower.includes('atras') || lower.includes('contatar') ? 'danger' : 'warning';
  return `<span class="badge ${tone}">${status}</span>`;
}

function renderAgenda(filter = '') {
  const statusFilter = document.getElementById('agenda-status').value;
  const normalized = filter.toLowerCase();
  const rows = appointments.filter(item => {
    const textMatch = `${item.patient} ${item.doctor} ${item.specialty}`.toLowerCase().includes(normalized);
    const statusMatch = !statusFilter || item.status === statusFilter;
    return textMatch && statusMatch;
  });

  document.getElementById('agenda-table').innerHTML = rows.map(item => `
    <tr><td>${item.time}</td><td>${item.patient}</td><td>${item.doctor}</td><td>${item.specialty}</td><td>${badge(item.status)}</td><td><button class="secondary-button" data-view="prontuario">Abrir</button></td></tr>
  `).join('') || '<tr><td colspan="6">Nenhum agendamento encontrado.</td></tr>';
}

function renderPatients(filter = '') {
  const normalized = filter.toLowerCase();
  const filtered = patients.filter(item => `${item.name} ${item.phone}`.toLowerCase().includes(normalized));
  document.getElementById('patient-cards').innerHTML = filtered.map(item => `
    <article class="patient-card"><h3>${item.name}</h3><p>${item.age} anos · ${item.phone}</p><p>${item.flags.map(flag => `<span class="badge ${flag.includes('Reação') ? 'danger' : 'warning'}">${flag}</span>`).join(' ')}</p><button class="secondary-button" data-view="prontuario">Abrir prontuário</button></article>
  `).join('') || '<p>Nenhum paciente encontrado.</p>';
}

function renderDoctors(filter = '') {
  const normalized = filter.toLowerCase();
  const filtered = doctors.filter(item => `${item.name} ${item.crm} ${item.rqe} ${item.specialty} ${item.email}`.toLowerCase().includes(normalized));
  document.getElementById('doctor-cards').innerHTML = filtered.map(item => `
    <article class="patient-card"><div class="panel-header"><div><p class="eyebrow">${item.specialty}</p><h3>${item.name}</h3></div><span class="badge success">${item.status}</span></div><p><strong>${item.crm}</strong> · ${item.rqe}</p><p>${item.phone}<br>${item.email}</p><p><strong>Agenda:</strong> ${item.schedule}</p><button class="secondary-button" type="button" data-doctor="${item.name}">Ver cadastro</button></article>
  `).join('') || '<p>Nenhum médico encontrado.</p>';
}

function renderList(targetId, items) {
  document.getElementById(targetId).innerHTML = items.map(item => `
    <div class="followup-item"><div><strong>${item.title}</strong><p>${item.detail}</p></div><span class="badge ${item.tone}">${item.status}</span></div>
  `).join('');
}

function renderToday() {
  document.getElementById('today-appointments').innerHTML = appointments.slice(0, 4).map(item => `
    <div class="list-item"><strong>${item.time}</strong><div><strong>${item.patient}</strong><p>${item.specialty} · ${item.doctor}</p></div>${badge(item.status)}</div>
  `).join('');
}

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('modal-form');

function openModal(type) {
  if (type === 'appointment') {
    modalTitle.textContent = 'Novo agendamento';
    modalForm.innerHTML = `
      <label>Paciente<input required placeholder="Nome do paciente" /></label>
      <label>Médico<select><option>Dr. Hans Chucrute</option><option>Dra. Paula Reis</option><option>Dra. Laura Nunes</option></select></label>
      <label>Data e horário<input required type="datetime-local" /></label>
      <label>Observação<input placeholder="Ex.: retorno, encaixe" /></label>
      <div class="form-actions"><button class="primary-button" type="submit">Agendar</button></div>`;
  } else if (type === 'patient') {
    modalTitle.textContent = 'Novo paciente';
    modalForm.innerHTML = `
      <label>Nome completo<input required placeholder="Nome do paciente" /></label>
      <label>Data de nascimento<input required type="date" /></label>
      <label>Telefone<input required placeholder="(11) 99999-9999" /></label>
      <label>Observação clínica inicial<textarea placeholder="Somente informações essenciais conhecidas no cadastro"></textarea></label>
      <div class="form-actions"><button class="primary-button" type="submit">Cadastrar</button></div>`;
  } else {
    modalTitle.textContent = 'Novo médico';
    modalForm.innerHTML = `
      <label>Nome completo<input required placeholder="Nome do médico" /></label>
      <label>CPF<input required placeholder="000.000.000-00" /></label>
      <label>Data de nascimento<input required type="date" /></label>
      <label>CRM<input required placeholder="Ex.: 184521" /></label>
      <label>UF do CRM<select required><option value="">Selecione</option><option>SP</option><option>RJ</option><option>MG</option><option>PR</option><option>SC</option><option>RS</option><option>Outro</option></select></label>
      <label>RQE<input placeholder="Registro de Qualificação de Especialista" /></label>
      <label>Especialidade principal<input required placeholder="Ex.: Clínica Médica" /></label>
      <label>Subespecialidade<input placeholder="Opcional" /></label>
      <label>Telefone<input required placeholder="(11) 99999-9999" /></label>
      <label>E-mail<input required type="email" placeholder="medico@clinicahans.com.br" /></label>
      <label>CEP<input placeholder="00000-000" /></label>
      <label>Endereço<input placeholder="Rua, número e complemento" /></label>
      <label>Cidade / UF<input placeholder="Ex.: São Paulo / SP" /></label>
      <label>Duração padrão da consulta<select><option>20 minutos</option><option selected>30 minutos</option><option>40 minutos</option><option>60 minutos</option></select></label>
      <label>Sala / consultório<input placeholder="Ex.: Consultório 02" /></label>
      <label>Disponibilidade semanal<textarea placeholder="Ex.: Segunda a sexta, das 08h às 17h"></textarea></label>
      <label>Modalidade<select><option>Presencial</option><option>Telemedicina</option><option>Presencial e telemedicina</option></select></label>
      <label>Status<select><option>Ativo</option><option>Inativo</option><option>Férias/Afastado</option></select></label>
      <label>Observações administrativas<textarea placeholder="Informações internas do cadastro"></textarea></label>
      <div class="form-actions"><button class="primary-button" type="submit">Cadastrar médico</button></div>`;
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

document.getElementById('new-appointment').addEventListener('click', () => openModal('appointment'));
document.getElementById('new-patient').addEventListener('click', () => openModal('patient'));
document.getElementById('new-doctor').addEventListener('click', () => openModal('doctor'));
document.getElementById('close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
modalForm.addEventListener('submit', event => { event.preventDefault(); closeModal(); toast('Registro salvo no protótipo.'); });
document.getElementById('consultation-form').addEventListener('submit', event => { event.preventDefault(); toast('Atendimento finalizado no protótipo.'); setView('prontuario'); });
document.getElementById('agenda-search').addEventListener('input', event => renderAgenda(event.target.value));
document.getElementById('agenda-status').addEventListener('change', () => renderAgenda(document.getElementById('agenda-search').value));
document.getElementById('patient-search').addEventListener('input', event => renderPatients(event.target.value));
document.getElementById('doctor-search').addEventListener('input', event => renderDoctors(event.target.value));
document.getElementById('doctor-cards').addEventListener('click', event => { const button = event.target.closest('[data-doctor]'); if (button) toast(`Cadastro de ${button.dataset.doctor} aberto no protótipo.`); });
document.getElementById('role-select').addEventListener('change', event => toast(`Perfil de visualização: ${event.target.value}.`));

document.querySelectorAll('.task-list input').forEach(input => input.addEventListener('change', event => {
  event.target.closest('label').style.opacity = event.target.checked ? '.55' : '1';
}));

renderToday();
renderAgenda();
renderPatients();
renderDoctors();
renderList('exam-list', exams);
renderList('return-list', returns);
