import { appointmentApi, patientApi } from '../services/api.js?v=uc-ag-01';
import { mountScreen, renderError, showToast, openModal, closeModal } from '../shared/screen.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';
import { empty, loading } from '../components/ui.js';

const root = mountScreen({ key: 'novo-agendamento', title: 'Novo agendamento', roles: ['RECEPCAO', 'ADMIN'] });
if (root) void init();

async function init() {
  root.innerHTML = `
    <form id="smart-search" class="panel smart-search-form">
      <div class="panel-header"><div><h2>Encontre um horário</h2><p>Pesquise com suas palavras. Combine médico, especialidade, dia e período.</p></div></div>
      <label for="schedule-query">Pesquisa inteligente</label>
      <div class="toolbar"><input id="schedule-query" name="q" maxlength="160" required autocomplete="off" placeholder="Ex.: Dra. Ana segundas à tarde, cardiologia ou quarta de manhã"><button class="primary-button" type="submit">Pesquisar horários</button></div>
      <p class="search-examples">Você também pode informar uma data (20/10/2026) ou um horário (14h30).</p>
    </form>
    <div id="search-summary" aria-live="polite"></div>
    <section id="schedule-results" aria-label="Horários encontrados"></section>`;
  root.querySelector('#smart-search').addEventListener('submit', searchSlots);
}

async function searchSlots(event) {
  event.preventDefault();
  const query = root.querySelector('#schedule-query').value.trim();
  const results = root.querySelector('#schedule-results');
  const summary = root.querySelector('#search-summary');
  results.innerHTML = loading('Consultando agendas e horários...');
  summary.replaceChildren();
  try {
    const response = await appointmentApi.smartSearch(query);
    const criteria = response.criteria;
    const filters = [
      criteria.doctor && `Médico: ${criteria.doctor}`,
      criteria.specialty && `Especialidade: ${criteria.specialty}`,
      criteria.weekday && `Dia: ${weekdayLabel(criteria.weekday)}`,
      criteria.period && `Período: ${criteria.period.toLowerCase()}`,
      criteria.date && `Data: ${new Date(`${criteria.date}T12:00:00`).toLocaleDateString('pt-BR')}`,
      criteria.time && `Horário: ${criteria.time.slice(0, 5)}`
    ].filter(Boolean);
    summary.innerHTML = filters.length
      ? `<div class="criteria-list" aria-label="Critérios identificados">${filters.map(item => `<span class="criteria-chip">${escapeHtml(item)}</span>`).join('')}</div>`
      : '';
    if (response.message) {
      results.innerHTML = empty(response.message);
      return;
    }
    if (!response.slots.length) {
      results.innerHTML = empty('Não foram encontrados horários para os critérios informados.');
      return;
    }
    renderSlots(response.slots, results);
  } catch (error) {
    results.innerHTML = '';
    renderError(results, error);
  }
}

function renderSlots(slots, target) {
  target.innerHTML = `
    <div class="panel-header schedule-heading"><h2>Horários compatíveis</h2><span>${slots.length} opções</span></div>
    <div class="schedule-legend" aria-label="Legenda">
      <span><i class="legend-dot available"></i>Disponível</span>
      <span><i class="legend-dot pending"></i>Agendada, aguardando confirmação</span>
      <span><i class="legend-dot confirmed"></i>Confirmada ou em atendimento</span>
    </div>
    <div class="table-wrap panel"><table class="schedule-table"><thead><tr><th>Data e hora</th><th>Médico</th><th>Especialidade</th><th>Situação</th><th>Ação</th></tr></thead>
      <tbody>${slots.map((slot, index) => slotRow(slot, index)).join('')}</tbody></table></div>`;
  target.querySelectorAll('[data-slot-index]').forEach(button => button.addEventListener('click', () => {
    openPatientPicker(slots[Number(button.dataset.slotIndex)]);
  }));
}

function slotRow(slot, index) {
  const status = slot.status;
  const available = status === 'AVAILABLE';
  const confirmed = ['CONFIRMED', 'CHECKED_IN', 'IN_CARE', 'COMPLETED'].includes(status);
  const label = available ? 'Disponível' : confirmed ? 'Confirmada / em atendimento' : 'Aguardando confirmação';
  const tone = available ? 'slot-available' : confirmed ? 'slot-confirmed' : 'slot-pending';
  return `<tr class="${tone}"><td>${escapeHtml(formatDateTime(slot.startsAt))}</td><td>${escapeHtml(slot.doctorName)}</td>
    <td>${escapeHtml(slot.specialtyName || 'Não informada')}</td><td>${escapeHtml(label)}</td>
    <td>${available ? `<button class="target-button" type="button" data-slot-index="${index}" aria-label="Selecionar horário de ${escapeHtml(slot.doctorName)} em ${escapeHtml(formatDateTime(slot.startsAt))}" title="Selecionar horário">◎</button>` : '<span aria-hidden="true">—</span>'}</td></tr>`;
}

function openPatientPicker(slot) {
  openModal('Selecione o paciente', `
    <div id="patient-picker">
      <p class="muted-copy">${escapeHtml(slot.doctorName)} · ${escapeHtml(slot.specialtyName || 'Especialidade não informada')} · ${escapeHtml(formatDateTime(slot.startsAt))}</p>
      <label for="patient-query">Nome, CPF ou número da carteirinha</label>
      <input id="patient-query" type="search" maxlength="80" autocomplete="off" placeholder="Digite pelo menos 2 caracteres">
      <div id="patient-results" class="patient-search-results" aria-live="polite">${empty('Digite para pesquisar o paciente.')}</div>
      <div id="appointment-confirmation"></div>
    </div>`, modal => {
    const input = modal.querySelector('#patient-query');
    const results = modal.querySelector('#patient-results');
    let timer;
    let requestId = 0;
    input.focus();
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const query = input.value.trim();
      const currentRequest = ++requestId;
      if (query.length < 2) {
        results.innerHTML = empty('Digite pelo menos 2 caracteres para pesquisar.');
        return;
      }
      results.innerHTML = loading('Pesquisando pacientes...');
      timer = setTimeout(async () => {
        try {
          const response = await patientApi.smartSearch(query);
          if (currentRequest !== requestId) return;
          if (response.refineRequired || response.message) {
            results.innerHTML = empty(response.message || 'Nenhum paciente encontrado para os critérios informados.');
            return;
          }
          results.innerHTML = `<div class="patient-result-list">${response.patients.map(patient => `
            <button class="patient-result" type="button" data-patient-id="${escapeHtml(patient.id)}">
              <strong>${escapeHtml(patient.fullName)}</strong>
              <span>CPF: ${escapeHtml(patient.cpf || 'não informado')} · Carteirinha: ${escapeHtml(patient.insuranceCard || 'não informada')}</span>
            </button>`).join('')}</div>`;
          results.querySelectorAll('[data-patient-id]').forEach(button => button.addEventListener('click', () => {
            const patient = response.patients.find(item => item.id === button.dataset.patientId);
            confirmAppointment(slot, patient, modal);
          }));
        } catch (error) {
          results.innerHTML = `<div class="state-card error">${escapeHtml(error.message)}</div>`;
        }
      }, 250);
    });
  });
}

function confirmAppointment(slot, patient, modal) {
  const confirmation = modal.querySelector('#appointment-confirmation');
  confirmation.innerHTML = `
    <form id="confirm-appointment" class="appointment-confirmation form-grid">
      <h3>Confirmar agendamento</h3>
      <p><strong>Paciente:</strong> ${escapeHtml(patient.fullName)}<br><strong>Horário:</strong> ${escapeHtml(formatDateTime(slot.startsAt))}</p>
      <label>Modalidade<select name="modality" required><option value="PRESENCIAL">Presencial</option><option value="TELEMEDICINA">Telemedicina</option><option value="HIBRIDO">Híbrido</option></select></label>
      <label>Observação (opcional)<input name="notes" maxlength="500"></label>
      <div class="form-actions"><button class="primary-button" type="submit">Confirmar agendamento</button></div>
    </form>`;
  confirmation.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Salvando...';
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await appointmentApi.create({
        patientId: patient.id,
        doctorId: slot.doctorId,
        startsAt: new Date(slot.startsAt).toISOString(),
        durationMinutes: Math.round((new Date(slot.endsAt) - new Date(slot.startsAt)) / 60000),
        modality: values.modality,
        notes: values.notes
      });
      closeModal();
      showToast('Agendamento criado.', 'success');
      await searchSlots({ preventDefault() {} });
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Confirmar agendamento';
      const old = confirmation.querySelector('.state-card.error');
      old?.remove();
      confirmation.insertAdjacentHTML('beforeend', `<div class="state-card error">${escapeHtml(error.message)}</div>`);
    }
  });
}

function weekdayLabel(value) {
  return ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][value - 1] || '';
}
