import { doctorApi } from '../services/api.js';
import { escapeHtml } from '../utils/html.js';

// Os atalhos de ano, mês e dia são convertidos em limites de data inclusivos.
export function reportFilterFields({ from, to, doctorId = '', specialtyId = '' }) {
  return `<label>De<input type="date" name="from" value="${escapeHtml(from)}" required></label>
    <label>Até<input type="date" name="to" value="${escapeHtml(to)}" required></label>
    <label>Ano<input type="number" name="year" min="100" max="9999" placeholder="Todos no período"></label>
    <label>Mês<input type="number" name="month" min="1" max="12" placeholder="1 a 12"></label>
    <label>Dia<input type="number" name="day" min="1" max="31" placeholder="1 a 31"></label>
    <label>Especialidade<select name="specialtyId"><option value="">Todas</option>${specialtyId ? `<option value="${escapeHtml(specialtyId)}" selected>Especialidade selecionada</option>` : ''}</select></label>
    <label>Buscar médico<input type="search" name="doctorSearch" placeholder="Nome ou CRM" autocomplete="off"></label>
    <label>Médico<select name="doctorId"><option value="">Todos</option>${doctorId ? `<option value="${escapeHtml(doctorId)}" selected>Médico selecionado</option>` : ''}</select></label>
    <p class="filter-help">Ano, mês e dia definem o período. Para usar mês informe o ano; para usar dia informe ano e mês.</p>
    <p class="filter-help" data-filter-message role="status" aria-live="polite"></p>`;
}

export async function setupReportFilters(form) {
  const message = form.querySelector('[data-filter-message]');
  const doctorSelect = form.elements.doctorId;
  const specialtySelect = form.elements.specialtyId;
  const selectedDoctor = doctorSelect.value;
  const selectedSpecialty = specialtySelect.value;
  for (const name of ['year', 'month', 'day']) form.elements[name].addEventListener('change', () => {
    try {
      const filters = readReportFilters(form);
      form.elements.from.value = filters.from;
      form.elements.to.value = filters.to;
      message.textContent = '';
    } catch (error) { message.textContent = error.message; }
  });
  for (const name of ['from', 'to']) form.elements[name].addEventListener('change', () => {
    form.elements.year.value = '';
    form.elements.month.value = '';
    form.elements.day.value = '';
  });
  const [specialties, doctors] = await Promise.allSettled([doctorApi.specialties(), doctorApi.search('', 100)]);
  if (specialties.status === 'fulfilled') setOptions(specialtySelect, specialties.value, selectedSpecialty, 'Todas', item => item.name);
  if (doctors.status === 'fulfilled') setOptions(doctorSelect, doctors.value, selectedDoctor, 'Todos', item => item.fullName);
  if (specialties.status === 'rejected' || doctors.status === 'rejected') message.textContent = 'Não foi possível carregar todos os filtros. Tente novamente.';

  let request = 0;
  let timer;
  form.elements.doctorSearch.addEventListener('input', () => {
    clearTimeout(timer);
    const term = form.elements.doctorSearch.value;
    const sequence = ++request;
    timer = setTimeout(async () => {
      try {
        const results = await doctorApi.search(term, 100);
        if (sequence !== request) return;
        setOptions(doctorSelect, results, doctorSelect.value, 'Todos', item => item.fullName);
        message.textContent = results.length === 100 ? 'Refine a busca para encontrar outros médicos.' : '';
      } catch {
        if (sequence === request) message.textContent = 'Não foi possível buscar médicos.';
      }
    }, 300);
  });
}

function setOptions(select, items, selected, allLabel, label) {
  const priorLabel = select.selectedOptions[0]?.textContent;
  select.innerHTML = `<option value="">${allLabel}</option>${items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(label(item))}</option>`).join('')}`;
  if (selected && !items.some(item => item.id === selected)) select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(selected)}">${escapeHtml(priorLabel || 'Selecionado')}</option>`);
  select.value = selected;
}

export function readReportFilters(form) {
  const data = new FormData(form);
  let from = String(data.get('from'));
  let to = String(data.get('to'));
  const year = String(data.get('year')).trim();
  const month = String(data.get('month')).trim();
  const day = String(data.get('day')).trim();
  if ((!year && (month || day)) || (!month && day)) throw new Error('Informe o ano para filtrar por mês e informe ano e mês para filtrar por dia.');
  if (year) {
    const y = Number(year), m = month ? Number(month) : 1, d = day ? Number(day) : 1;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (y < 100 || y > 9999 || m < 1 || m > 12 || d < 1 || d > lastDay) throw new Error('Informe uma data válida, com ano entre 100 e 9999.');
    const date = (mo, da) => `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
    from = date(m, d);
    to = day ? from : month ? date(m, lastDay) : date(12, 31);
  }
  if (from > to) throw new Error('A data inicial deve ser anterior ou igual à data final.');
  return { from, to, doctorId: String(data.get('doctorId')), specialtyId: String(data.get('specialtyId')) };
}
