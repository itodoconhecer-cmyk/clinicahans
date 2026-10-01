import { escapeHtml } from '../utils/html.js';

export function showToast(message, tone = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

export function loading(message = 'Carregando...') {
  return `<div class="state-card"><div class="spinner" aria-hidden="true"></div><p>${escapeHtml(message)}</p></div>`;
}

export function empty(message = 'Nenhum registro encontrado.') {
  return `<div class="state-card"><p>${escapeHtml(message)}</p></div>`;
}

export function errorCard(message, correlationId) {
  return `<div class="state-card error"><strong>Não foi possível concluir a operação.</strong><p>${escapeHtml(message)}</p>${correlationId ? `<small>Correlação: ${escapeHtml(correlationId)}</small>` : ''}</div>`;
}

export function badge(text, tone = 'neutral') {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}
