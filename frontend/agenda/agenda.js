import { appointmentApi, doctorApi } from '../services/api.js';
import { mountScreen, renderError, localDayRange, toneForStatus } from '../shared/screen.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';
import { empty, badge } from '../components/ui.js';
import { bindScheduleGrid, gridScheduleMarkup, renderScheduleViews, verticalScheduleMarkup } from '../components/schedule-views.js';

const root = mountScreen({ key: 'agenda', title: 'Agenda', roles: ['RECEPCAO', 'MEDICO', 'ADMIN'] });
if (root) void init();

async function init() {
  try {
    const [from, to] = localDayRange();
    const [rows, doctors] = await Promise.all([appointmentApi.list(from, to), doctorApi.search('', 100)]);
    const doctorNames = new Map(doctors.map(doctor => [doctor.id, doctor.fullName]));
    root.innerHTML = `
      <div class="panel-header"><div><h2>Agenda do dia</h2><p class="muted-copy">${rows.length} ${rows.length === 1 ? 'agendamento' : 'agendamentos'} na agenda</p></div>
        <a class="primary-button" href="../novo-agendamento/novo-agendamento.html">Novo agendamento</a></div>
      <section id="agenda-views" aria-label="Visualização dos agendamentos"></section>`;

    const appointments = rows.map(appointment => ({
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      doctorId: appointment.doctorId,
      doctorName: doctorNames.get(appointment.doctorId) || 'Médico',
      status: appointment.status,
      detail: 'Consulta na agenda'
    }));
    let selectedGridDay = '';
    renderScheduleViews(root.querySelector('#agenda-views'), {
      horizontal: () => rows.length ? `<div class="table-wrap panel"><table><thead><tr><th>Horário</th><th>Paciente</th><th>Médico</th><th>Status</th></tr></thead><tbody>${rows.map(appointment => `
        <tr><td>${escapeHtml(formatDateTime(appointment.startsAt))}</td><td>${escapeHtml(appointment.patientId)}</td>
          <td>${escapeHtml(appointment.doctorId)}</td><td>${badge(appointment.status, toneForStatus(appointment.status))}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma consulta hoje.'),
      vertical: () => verticalScheduleMarkup(appointments, 'Nenhuma consulta hoje.'),
      grid: () => gridScheduleMarkup(appointments, selectedGridDay, 'Nenhuma consulta hoje.'),
      onRender: (view, content, refresh) => {
        if (view === 'grid') bindScheduleGrid(content, appointments, day => { selectedGridDay = day; refresh(); });
      }
    });
  } catch (error) {
    renderError(root, error);
  }
}
