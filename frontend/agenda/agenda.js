import { appointmentApi } from '../services/api.js';
import { mountScreen, renderError, localWeekRange, toneForStatus } from '../shared/screen.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';
import { empty, badge } from '../components/ui.js';
import { renderScheduleViews, verticalScheduleMarkup } from '../components/schedule-views.js';
import { bindWeeklyCalendar, weeklyCalendarMarkup } from '../components/calendar-grid.js';

const root = mountScreen({ key: 'agenda', title: 'Agenda', roles: ['RECEPCAO', 'MEDICO', 'ADMIN'] });
if (root) void init();

async function init() {
  try {
    const [from, to] = localWeekRange();
    const rows = await appointmentApi.calendar(from, to);
    root.innerHTML = `
      <div class="panel-header"><div><h2>Agenda da semana</h2><p class="muted-copy">${rows.length} ${rows.length === 1 ? 'agendamento' : 'agendamentos'} na agenda</p></div>
        <a class="primary-button" href="../novo-agendamento/novo-agendamento.html">Novo agendamento</a></div>
      <section id="agenda-views" aria-label="Visualização dos agendamentos"></section>`;

    const appointments = rows.map(appointment => ({
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      appointmentId: appointment.appointmentId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      specialtyName: appointment.specialtyName,
      maskedPatientName: appointment.maskedPatientName,
      status: appointment.status,
      detail: 'Consulta na agenda'
    }));
    let selectedGridWeek = '';
    renderScheduleViews(root.querySelector('#agenda-views'), {
      horizontal: () => rows.length ? `<div class="table-wrap panel"><table><thead><tr><th>Horário</th><th>Paciente</th><th>Médico</th><th>Status</th></tr></thead><tbody>${rows.map(appointment => `
        <tr><td>${escapeHtml(formatDateTime(appointment.startsAt))}</td><td>${escapeHtml(appointment.maskedPatientName || 'Paciente reservado')}</td>
          <td>${escapeHtml(appointment.doctorName || 'Médico')}</td><td>${badge(appointment.status, toneForStatus(appointment.status))}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma consulta nesta semana.'),
      vertical: () => verticalScheduleMarkup(appointments, 'Nenhuma consulta nesta semana.'),
      grid: () => weeklyCalendarMarkup(appointments, selectedGridWeek, 'Nenhuma consulta nesta semana.'),
      onRender: (view, content, refresh) => {
        if (view === 'grid') bindWeeklyCalendar(content, appointments, week => { selectedGridWeek = week; refresh(); });
      }
    });
  } catch (error) {
    renderError(root, error);
  }
}
