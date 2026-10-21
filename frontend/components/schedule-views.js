import { escapeHtml } from '../utils/html.js';

const PREFERENCE_KEY = 'clinicahans.schedule-view';

export function renderScheduleViews(target, { horizontal, vertical, onRender }) {
  target.innerHTML = `
    <div class="schedule-view-switch">
      <span>Visualização</span>
      <div class="schedule-view-buttons" role="group" aria-label="Visualização da agenda">
        <button type="button" class="schedule-view-button" data-schedule-view="horizontal" aria-pressed="false">Lista horizontal</button>
        <button type="button" class="schedule-view-button" data-schedule-view="vertical" aria-pressed="false">Agenda vertical</button>
      </div>
    </div>
    <div class="schedule-view-content" data-schedule-view-content></div>`;

  const content = target.querySelector('[data-schedule-view-content]');
  const buttons = [...target.querySelectorAll('[data-schedule-view]')];
  const render = view => {
    content.innerHTML = (view === 'vertical' ? vertical : horizontal)();
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scheduleView === view)));
    try { localStorage.setItem(PREFERENCE_KEY, view); } catch { /* preferência é opcional */ }
    onRender?.(view, content);
  };

  let initialView = 'horizontal';
  try {
    if (localStorage.getItem(PREFERENCE_KEY) === 'vertical') initialView = 'vertical';
  } catch { /* navegador pode bloquear armazenamento local */ }
  buttons.forEach(button => button.addEventListener('click', () => render(button.dataset.scheduleView)));
  render(initialView);
  return content;
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
