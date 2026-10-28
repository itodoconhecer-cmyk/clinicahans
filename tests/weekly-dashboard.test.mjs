import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyPeriod, fillWeeks } from '../frontend/utils/weekly-dashboard.js';

test('considera o dia da clínica quando UTC já está na segunda e cruza o ano', () => {
  assert.deepEqual(weeklyPeriod(4, new Date('2026-01-05T01:00:00Z')), { from: '2025-12-08', to: '2026-01-04' });
  assert.deepEqual(weeklyPeriod(4, new Date('2026-01-05T03:00:00Z')), { from: '2025-12-15', to: '2026-01-05' });
});

test('preenche semanas ausentes mantendo contagens e ordem', () => {
  assert.deepEqual(fillWeeks([{ key: '2026-10-26', records: 7, cancelled: 2, noShows: 1 }], '2026-10-19', '2026-10-27'), [
    { key: '2026-10-19', label: '19/10', records: 0, cancelled: 0, noShows: 0 },
    { key: '2026-10-26', label: '26/10', records: 7, cancelled: 2, noShows: 1 }
  ]);
});
