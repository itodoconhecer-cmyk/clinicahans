const DAY = 86400000;
const iso = date => date.toISOString().slice(0, 10);

export function weeklyPeriod(count = 8, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  const today = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const monday = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY);
  return { from: iso(new Date(monday.getTime() - (count - 1) * 7 * DAY)), to: iso(today) };
}

export function fillWeeks(rows, from, to) {
  const byWeek = new Map(rows.map(row => [row.key, row]));
  const weeks = [];
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 7 * DAY) {
    const key = iso(new Date(time));
    const row = byWeek.get(key);
    weeks.push({ key, label: `${key.slice(8, 10)}/${key.slice(5, 7)}`, records: Number(row?.records || 0),
      cancelled: Number(row?.cancelled || 0), noShows: Number(row?.noShows || 0) });
  }
  return weeks;
}
