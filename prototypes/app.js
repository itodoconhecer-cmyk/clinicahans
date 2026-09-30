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
  dashboard: 'Visão geral', agenda: 'Agenda médica', pacientes: 'Pacientes', prontuario: 'Prontuário integrado', atendimento: 'Atendimento clínico', exames: 'Exames e retornos', financeiro: 'Faturamento', indicadores: 'Indicadores de gestão'
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
  } else {
    modalTitle.textContent = 'Novo paciente';
    modalForm.innerHTML = `
      <label>Nome completo<input required placeholder="Nome do paciente" /></label>
      <label>Data de nascimento<input required type="date" /></label>
      <label>Telefone<input required placeholder="(11) 99999-9999" /></label>
      <label>Observação clínica inicial<textarea placeholder="Somente informações essenciais conhecidas no cadastro"></textarea></label>
      <div class="form-actions"><button class="primary-button" type="submit">Cadastrar</button></div>`;
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
document.getElementById('close-modal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
modalForm.addEventListener('submit', event => { event.preventDefault(); closeModal(); toast('Registro salvo no protótipo.'); });
document.getElementById('consultation-form').addEventListener('submit', event => { event.preventDefault(); toast('Atendimento finalizado no protótipo.'); setView('prontuario'); });
document.getElementById('agenda-search').addEventListener('input', event => renderAgenda(event.target.value));
document.getElementById('agenda-status').addEventListener('change', () => renderAgenda(document.getElementById('agenda-search').value));
document.getElementById('patient-search').addEventListener('input', event => renderPatients(event.target.value));
document.getElementById('role-select').addEventListener('change', event => toast(`Perfil de visualização: ${event.target.value}.`));

document.querySelectorAll('.task-list input').forEach(input => input.addEventListener('change', event => {
  event.target.closest('label').style.opacity = event.target.checked ? '.55' : '1';
}));

renderToday();
renderAgenda();
renderPatients();
renderList('exam-list', exams);
renderList('return-list', returns);
