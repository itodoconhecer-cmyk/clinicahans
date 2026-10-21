import { escapeHtml } from '../utils/html.js';

const PREFERENCE_KEY = 'clinicahans.schedule-view';

export function renderScheduleViews(target, { horizontal, vertical, grid, onRender }) {
  target.innerHTML = `
    <div class="schedule-view-switch">
      <span>Visualização</span>
      <div class="schedule-view-buttons" role="group" aria-label="Visualização da agenda">
        <button type="button" class="schedule-view-button" data-schedule-view="horizontal" aria-pressed="false">Lista horizontal</button>
        <button type="button" class="schedule-view-button" data-schedule-view="vertical" aria-pressed="false">Agenda vertical</button>
        <button type="button" class="schedule-view-button" data-schedule-view="grid" aria-pressed="false">Grade 360°</button>
      </div>
    </div>
    <div class="schedule-view-content" data-schedule-view-content></div>`;

  const content = target.querySelector('[data-schedule-view-content]');
  const buttons = [...target.querySelectorAll('[data-schedule-view]')];
  const render = view => {
    const renderer = view === 'vertical' ? vertical : view === 'grid' ? grid : horizontal;
    content.innerHTML = (renderer || horizontal)();
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scheduleView === view)));
    try { localStorage.setItem(PREFERENCE_KEY, view); } catch { /* preferência é opcional */ }
    onRender?.(view, content, () => render(view));
  };

  let initialView = 'horizontal';
  try {
    const savedView = localStorage.getItem(PREFERENCE_KEY);
    if (savedView === 'vertical' || savedView === 'grid') initialView = savedView;
  } catch { /* navegador pode bloquear armazenamento local */ }
  buttons.forEach(button => button.addEventListener('click', () => render(button.dataset.scheduleView)));
  render(initialView);
  return content;
}

export function scheduleDays(events) {
  return [...new Set(events.map(event => dayKey(event.startsAt)))].sort();
}

export function gridScheduleMarkup(events, selectedDay, emptyMessage = 'Nenhum compromisso neste período.') {
  if (!events.length) return `<div class="state-card"><p>${escapeHtml(emptyMessage)}</p></div>`;

  const days = scheduleDays(events);
  const day = days.includes(selectedDay) ? selectedDay : days[0];
  const dayEvents = events.filter(event => dayKey(event.startsAt) === day);
  const dayIndex = days.indexOf(day);
  const providers = [...new Map(dayEvents.map(event => {
    const id = event.doctorId || event.doctorName || 'unknown';
    return [id, { id, name: event.doctorName || 'Médico' }];
  })).values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  const minMinute = Math.min(...dayEvents.map(event => minuteOf(event.startsAt)));
  const maxMinute = Math.max(...dayEvents.map(event => minuteOf(event.endsAt)));
  const startHour = Math.max(0, Math.min(8, Math.floor(minMinute / 60)));
  const endHour = Math.min(24, Math.max(18, Math.ceil(maxMinute / 60)));
  const height = (endHour - startHour) * 60;
  const startMinute = startHour * 60;
  const timeLabels = Array.from({ length: endHour - startHour }, (_, index) => {
    const hour = startHour + index;
    return `<span class="resource-grid-time" style="top:${index * 60}px">${String(hour).padStart(2, '0')}:00</span>`;
  }).join('');
  const columns = providers.map(provider => `<section class="resource-grid-column" aria-label="${escapeHtml(provider.name)}" style="height:${height}px">
    ${dayEvents.filter(event => (event.doctorId || event.doctorName || 'unknown') === provider.id).map(event => resourceEventMarkup(event, startMinute)).join('')}
  </section>`).join('');

  return `<div class="resource-schedule">
    <div class="resource-schedule-toolbar">
      <button class="secondary-button resource-day-step" type="button" data-grid-step="-1" aria-label="Dia anterior" ${dayIndex === 0 ? 'disabled' : ''}>‹</button>
      <label class="resource-date-label" for="resource-grid-date">Dia
        <select id="resource-grid-date" data-grid-date>${days.map(value => `<option value="${value}" ${value === day ? 'selected' : ''}>${escapeHtml(formatDay(value))}</option>`).join('')}</select>
      </label>
      <button class="secondary-button resource-day-step" type="button" data-grid-step="1" aria-label="Próximo dia" ${dayIndex === days.length - 1 ? 'disabled' : ''}>›</button>
      <span class="muted-copy">${dayEvents.length} ${dayEvents.length === 1 ? 'item' : 'itens'} · ${providers.length} ${providers.length === 1 ? 'médico' : 'médicos'}</span>
    </div>
    <div class="resource-grid-scroll" role="region" aria-label="Grade da agenda por médico" tabindex="0">
      <div class="resource-grid" style="--resource-count:${providers.length}">
        <div class="resource-grid-header resource-grid-time-heading">Horário</div>
        ${providers.map(provider => `<div class="resource-grid-header resource-grid-doctor-heading">${escapeHtml(provider.name)}</div>`).join('')}
        <div class="resource-grid-time-axis" style="height:${height}px">${timeLabels}</div>
        ${columns}
      </div>
    </div>
    <div class="resource-grid-legend"><span><i class="legend-dot available"></i>Disponível</span><span><i class="legend-dot confirmed"></i>Agendamento</span></div>
  </div>`;
}

export function bindScheduleGrid(content, events, onDateChange) {
  const select = content.querySelector('[data-grid-date]');
  if (!select) return;
  const days = scheduleDays(events);
  select.addEventListener('change', () => onDateChange(select.value));
  content.querySelectorAll('[data-grid-step]').forEach(button => button.addEventListener('click', () => {
    const index = days.indexOf(select.value) + Number(button.dataset.gridStep);
    if (days[index]) onDateChange(days[index]);
  }));
}

function resourceEventMarkup(event, startMinute) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const offset = Math.max(0, minuteOf(event.startsAt) - startMinute);
  const duration = Math.max(24, Math.round((end - start) / 60000));
  const isAvailable = event.kind === 'available';
  const title = event.title || (isAvailable ? 'Disponível' : statusLabel(event.status));
  const detail = event.specialtyName || '';
  const classes = `resource-grid-event ${isAvailable ? 'resource-grid-event--available' : 'resource-grid-event--booked'}`;
  const content = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(formatTime(start))}–${escapeHtml(formatTime(end))}${detail ? ` · ${escapeHtml(detail)}` : ''}</small>`;
  return event.slotIndex === undefined
    ? `<article class="${classes}" style="top:${offset}px;height:${duration}px">${content}</article>`
    : `<button type="button" class="${classes}" style="top:${offset}px;height:${duration}px" data-slot-index="${event.slotIndex}" aria-label="Selecionar horário de ${escapeHtml(event.doctorName || 'médico')} às ${escapeHtml(formatTime(start))}">${content}</button>`;
}

function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minuteOf(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function verticalScheduleMarkup(events, emptyMessage = 'Nenhum compromisso neste período.') {
  if (!events.length) return `<div class="state-card"><p>${escapeHtml(emptyMessage)}</p></div>`;

  const byDay = new Map();
  [...events].sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
    .forEach(event => {
      const date = new Date(event.startsAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(event);
    });

  return `<div class="vertical-agenda">${[...byDay.entries()].map(([date, dayEvents]) => `
    <section class="agenda-day" aria-label="${escapeHtml(formatDay(date))}">
      <header class="agenda-day-heading"><strong>${escapeHtml(formatDay(date))}</strong><span>${dayEvents.length} ${dayEvents.length === 1 ? 'item' : 'itens'}</span></header>
      <ol class="agenda-day-events">${dayEvents.map(eventMarkup).join('')}</ol>
    </section>`).join('')}</div>`;
}

function eventMarkup(event) {
  const kind = event.kind === 'available' ? 'available' : 'booked';
  const status = statusLabel(event.status);
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const title = event.title || (kind === 'available' ? 'Horário disponível' : 'Agendamento');
  const detail = [event.doctorName, event.specialtyName].filter(Boolean).join(' · ') || event.detail || '';
  const statusClass = String(event.status || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const action = event.slotIndex === undefined ? '' : `
    <button class="agenda-event-action" type="button" data-slot-index="${event.slotIndex}">Selecionar horário</button>`;
  return `<li class="agenda-event agenda-event--${kind}">
    <time class="agenda-event-time" datetime="${escapeHtml(event.startsAt)}"><strong>${escapeHtml(formatTime(start))}</strong><small>até ${escapeHtml(formatTime(end))}</small></time>
    <article class="agenda-event-card">
      <div class="agenda-event-copy"><strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</div>
      <span class="agenda-event-status status-${statusClass}">${escapeHtml(status)}</span>${action}
    </article>
  </li>`;
}

function formatDay(key) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(new Date(`${key}T12:00:00`));
}

function formatTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function statusLabel(status = '') {
  return ({
    AVAILABLE: 'Disponível', SCHEDULED: 'Agendada', CONFIRMED: 'Confirmada',
    CHECKED_IN: 'Aguardando atendimento', IN_CARE: 'Em atendimento', COMPLETED: 'Concluída',
    CANCELLED: 'Cancelada', NO_SHOW: 'Não compareceu'
  })[status] || status || 'Ocupado';
}
