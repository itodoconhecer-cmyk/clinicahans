import { escapeHtml } from '../utils/html.js';

const WEEK = 7;
const ROW_MINUTES = 30;

export function calendarWeeks(events) {
  return [...new Set(events.map(event => weekStart(dayKey(event.startsAt))))].sort();
}

export function weeklyCalendarMarkup(events, selectedWeek, emptyMessage = 'Nenhum compromisso neste período.') {
  if (!events.length) return `<div class="state-card"><p>${escapeHtml(emptyMessage)}</p></div>`;

  const weeks = calendarWeeks(events);
  const week = weeks.includes(selectedWeek) ? selectedWeek : weeks[0];
  const dates = Array.from({ length: WEEK }, (_, index) => {
    const date = atNoon(week);
    date.setDate(date.getDate() + index);
    return dayKey(date);
  });
  const items = events.filter(event => weekStart(dayKey(event.startsAt)) === week);
  const minMinute = items.length ? Math.min(...items.map(event => minuteOf(event.startsAt))) : 8 * 60;
  const maxMinute = items.length ? Math.max(...items.map(event => minuteOf(event.endsAt))) : 18 * 60;
  const startMinute = Math.max(0, Math.min(8 * 60, Math.floor(minMinute / 60) * 60));
  const endMinute = Math.min(24 * 60, Math.max(18 * 60, Math.ceil(maxMinute / 60) * 60));
  const rows = [];

  for (let minute = startMinute; minute < endMinute; minute += ROW_MINUTES) {
    const cells = dates.map(date => {
      const cellEvents = items.filter(event => dayKey(event.startsAt) === date
        && Math.floor(minuteOf(event.startsAt) / ROW_MINUTES) * ROW_MINUTES === minute);
      return `<div class="week-grid-cell" aria-label="${escapeHtml(formatDate(date))} às ${formatTimeFromMinutes(minute)}">${cellEvents.map(eventCard).join('')}</div>`;
    }).join('');
    rows.push(`<div class="week-grid-row"><time class="week-grid-time">${formatTimeFromMinutes(minute)}</time>${cells}</div>`);
  }

  const weekIndex = weeks.indexOf(week);
  return `<div class="resource-schedule">
    <div class="resource-schedule-toolbar">
      <button class="secondary-button resource-day-step" type="button" data-grid-step="-1" aria-label="Semana anterior" ${weekIndex === 0 ? 'disabled' : ''}>‹</button>
      <label class="resource-date-label" for="calendar-grid-week">Semana
        <select id="calendar-grid-week" data-calendar-week>${weeks.map(value => `<option value="${value}" ${value === week ? 'selected' : ''}>${escapeHtml(formatWeek(value))}</option>`).join('')}</select>
      </label>
      <button class="secondary-button resource-day-step" type="button" data-grid-step="1" aria-label="Próxima semana" ${weekIndex === weeks.length - 1 ? 'disabled' : ''}>›</button>
      <span class="muted-copy">${items.length} ${items.length === 1 ? 'compromisso' : 'compromissos'} nesta semana</span>
    </div>
    <div class="week-grid-scroll" role="region" aria-label="Agenda semanal por dia e horário" tabindex="0">
      <div class="week-grid-header"><div class="week-grid-heading-time">Horário</div>${dates.map(date => `
        <div class="week-grid-heading-day"><strong>${escapeHtml(formatWeekday(date))}</strong><span>${escapeHtml(formatShortDate(date))}</span></div>`).join('')}
      </div>
      <div class="week-grid-body">${rows.join('')}</div>
    </div>
    <div class="resource-grid-legend"><span><i class="legend-dot available"></i>Disponível para agendamento</span><span><i class="legend-dot confirmed"></i>Agendamento existente</span>
      <span class="muted-copy">Os nomes de pacientes são mascarados pelo backend.</span>
    </div>
  </div>`;
}

export function bindWeeklyCalendar(content, events, onWeekChange) {
  const select = content.querySelector('[data-calendar-week]');
  if (!select) return;
  const weeks = calendarWeeks(events);
  select.addEventListener('change', () => onWeekChange(select.value));
  content.querySelectorAll('[data-grid-step]').forEach(button => button.addEventListener('click', () => {
    const index = weeks.indexOf(select.value) + Number(button.dataset.gridStep);
    if (weeks[index]) onWeekChange(weeks[index]);
  }));
}

function eventCard(event) {
  const available = event.kind === 'available';
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const patient = available ? 'Horário livre' : (event.maskedPatientName || 'Paciente reservado');
  const content = `<time>${escapeHtml(formatTime(start))}–${escapeHtml(formatTime(end))}</time>
    <strong>${escapeHtml(event.doctorName || 'Médico')}</strong>
    <span>${escapeHtml(event.specialtyName || 'Especialidade não informada')}</span>
    <small class="week-grid-patient">${available ? '' : 'Paciente: '}${escapeHtml(patient)}</small>`;
  const classes = `week-grid-event ${available ? 'week-grid-event--available' : 'week-grid-event--booked'}`;
  if (event.slotIndex === undefined) {
    return `<article class="${classes}" aria-label="${escapeHtml(event.doctorName || 'Médico')}, ${escapeHtml(event.specialtyName || 'especialidade não informada')}, ${escapeHtml(patient)}">${content}</article>`;
  }
  return `<button type="button" class="${classes}" data-slot-index="${event.slotIndex}" aria-label="Selecionar horário de ${escapeHtml(event.doctorName || 'médico')} às ${escapeHtml(formatTime(start))}">${content}</button>`;
}

function weekStart(key) {
  const date = atNoon(key);
  date.setDate(date.getDate() - (date.getDay() + 6) % WEEK);
  return dayKey(date);
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function atNoon(key) {
  return new Date(`${key}T12:00:00`);
}

function minuteOf(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function formatDate(key) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(atNoon(key));
}

function formatWeekday(key) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(atNoon(key));
}

function formatShortDate(key) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(atNoon(key));
}

function formatWeek(key) {
  const end = atNoon(key);
  end.setDate(end.getDate() + 6);
  return `${formatShortDate(key)} – ${formatShortDate(dayKey(end))}`;
}

function formatTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function formatTimeFromMinutes(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
