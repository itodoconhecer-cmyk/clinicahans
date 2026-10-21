import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { expect, test as base } from '@playwright/test';
import { RunRecorder } from './support/recording.mjs';

const apiBaseUrl = `http://127.0.0.1:${process.env.E2E_API_PORT || 8081}`;
const frontendOrigin = `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT || 5501}`;
const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL, max: 4 });

const test = base.extend({
  recorder: async ({ page }, use, testInfo) => {
    const recorder = new RunRecorder(page, testInfo);
    try {
      await use(recorder);
    } finally {
      await recorder.save();
    }
  },
  scenario: async ({ page, recorder }, use, testInfo) => {
    const scenario = await prepareScenario(page, recorder, testInfo);
    try {
      await use(scenario);
    } finally {
      await cleanupScenario(scenario, recorder);
    }
  }
});

test.beforeAll(async () => {
  const result = await pool.query('select current_database() as name');
  expect(result.rows[0].name).toMatch(/(^|[_-])(e2e|test)([_-]|$)/i);
});

test.afterAll(async () => {
  await pool.end();
});

test('recepção busca horário, agenda pela tela e confirma persistência, auditoria e outbox', async ({ page, scenario, recorder }) => {
  await test.step('abrir a tela de novo agendamento e pesquisar a data', async () => {
    await openScheduling(page, scenario);
    await expect(page.locator('[data-slot-index="0"]')).toBeVisible();
    await page.getByRole('button', { name: 'Grade 360°' }).click();
    await expect(page.locator('[data-slot-index="0"]')).toBeVisible();
    await recorder.mark('visualização Grade 360° mostra o slot disponível');
    await recorder.screenshot('grade-360-horario-disponivel');
    await page.getByRole('button', { name: 'Lista horizontal' }).click();
    await recorder.mark('horário disponível exibido', { date: scenario.dateLabel, startsAt: scenario.startsAt });
    await recorder.screenshot('01-horarios-disponiveis');
  });

  await test.step('selecionar paciente e confirmar o agendamento', async () => {
    await selectPatient(page, scenario.patientName);
    await recorder.screenshot('02-confirmacao-do-agendamento');
    const responsePromise = page.waitForResponse(response =>
      response.url().endsWith('/api/v1/appointments') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    scenario.appointment = await response.json();
    await expect(page.getByRole('status')).toContainText('Agendamento criado.');
    await recorder.mark('backend confirmou a criação', {
      status: response.status(), appointmentId: scenario.appointment.id,
      correlationId: response.headers()['x-correlation-id']
    });
  });

  await test.step('consultar o registro persistido no PostgreSQL', async () => {
    const persisted = await pool.query(`
      select id, patient_id, doctor_id, starts_at, ends_at, status
      from appointment where id = $1
    `, [scenario.appointment.id]);
    expect(persisted.rowCount).toBe(1);
    expect(persisted.rows[0].patient_id).toBe(scenario.patientId);
    expect(persisted.rows[0].doctor_id).toBe(scenario.doctorId);
    expect(persisted.rows[0].status).toBe('SCHEDULED');

    const [history, outbox, audit] = await Promise.all([
      pool.query("select count(*)::int as count from appointment_status_history where appointment_id = $1 and to_status = 'SCHEDULED'", [scenario.appointment.id]),
      pool.query("select count(*)::int as count from notification_outbox where aggregate_id = $1 and template_code = 'APPOINTMENT_CONFIRMATION'", [scenario.appointment.id]),
      pool.query("select count(*)::int as count from audit_event where entity_type = 'APPOINTMENT' and entity_id = $1 and action = 'APPOINTMENT_CREATED'", [scenario.appointment.id])
    ]);
    expect(history.rows[0].count).toBe(1);
    expect(outbox.rows[0].count).toBe(1);
    expect(audit.rows[0].count).toBe(1);

    recorder.mark('PostgreSQL confirmou agendamento, histórico, outbox e auditoria', {
      appointmentId: scenario.appointment.id,
      status: persisted.rows[0].status,
      startsAt: persisted.rows[0].starts_at,
      historyRows: history.rows[0].count,
      outboxRows: outbox.rows[0].count,
      auditRows: audit.rows[0].count
    });
    await recorder.screenshot('03-agendamento-criado');
  });

  const createRequest = recorder.events.find(event => event.kind === 'network'
    && event.method === 'POST' && event.url.endsWith('/api/v1/appointments'));
  expect(createRequest?.requestPayload).toMatchObject({
    doctorId: scenario.doctorId,
    patientId: scenario.patientId,
    modality: 'PRESENCIAL'
  });
  expect(createRequest.durationMs).toEqual(expect.any(Number));
});

test('slot bloqueado não aparece como disponível para reserva', async ({ page, scenario, recorder }) => {
  const block = await apiCall(page, `/api/v1/doctors/${scenario.doctorId}/blocks`, 'POST', {
    startsAt: scenario.startsAt,
    endsAt: scenario.endsAt,
    reason: 'Bloqueio operacional Playwright'
  });
  expect(block.status).toBe(200);
  recorder.mark('pré-condição: bloqueio de agenda criado via API de teste');

  await openScheduling(page, scenario);
  const blockedSlot = new RegExp(`Selecionar horário de ${scenario.doctorName} em ${scenario.dateLabel}, 13:00`);
  await expect(page.getByRole('button', { name: blockedSlot })).toHaveCount(0);
  await expect(page.locator('[data-slot-index]')).toHaveCount(5);
  await expect(page.locator('#schedule-results')).toContainText('5 disponíveis');
  await recorder.screenshot('slot-bloqueado-sem-disponibilidade');
});

test('médico inativo não oferece slots para agendamento', async ({ page, scenario, recorder }) => {
  expect(scenario.doctorStatus).toBe('INACTIVE');
  recorder.mark('pré-condição: médico inativo criado pela API real', { doctorId: scenario.doctorId });

  await openScheduling(page, scenario);
  await expect(page.locator('[data-slot-index]')).toHaveCount(0);
  await expect(page.locator('#schedule-results')).toContainText('Não foram encontrados horários disponíveis');
  await recorder.screenshot('medico-inativo-sem-disponibilidade');
});

test('conflito criado após a busca é recusado na tela e não duplica a reserva', async ({ page, scenario, recorder }) => {
  await openScheduling(page, scenario);
  await expect(page.locator('[data-slot-index="0"]')).toBeVisible();
  await selectPatient(page, scenario.patientName);

  const competing = await apiCall(page, '/api/v1/appointments', 'POST', appointmentPayload(scenario));
  expect(competing.status).toBe(200);
  scenario.competingAppointmentId = competing.body.id;
  recorder.mark('pré-condição: outro atendente reservou o mesmo slot após a busca', {
    competingAppointmentId: scenario.competingAppointmentId
  });

  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/appointments') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(409);
  await expect(page.locator('#appointment-confirmation .state-card.error')).toContainText(/conflit|integridade/i);
  await recorder.mark('backend recusou o conflito com HTTP 409', {
    status: response.status(), correlationId: response.headers()['x-correlation-id']
  });
  await recorder.screenshot('conflito-de-agenda-retornado-na-tela');

  await page.locator('#modal-close').click();
  await page.getByRole('button', { name: 'Pesquisar horários' }).click();
  await expect(page.locator('[data-slot-index]')).toHaveCount(0);
  await expect(page.locator('#schedule-results')).toContainText('Agendada');

  const rows = await pool.query('select count(*)::int as count from appointment where doctor_id = $1 and starts_at = $2',
    [scenario.doctorId, scenario.startsAt]);
  expect(rows.rows[0].count).toBe(1);
  recorder.mark('PostgreSQL confirma uma única reserva para o slot', { appointmentRows: rows.rows[0].count });
});

test('falha simulada do backend permanece visível na tela e permite repetir no servidor real', async ({ page, scenario, recorder }) => {
  await openScheduling(page, scenario);
  await expect(page.locator('[data-slot-index="0"]')).toBeVisible();
  await selectPatient(page, scenario.patientName);

  let intercepted = false;
  await page.route('**/api/v1/appointments', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    intercepted = true;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': frontendOrigin,
        'Access-Control-Expose-Headers': 'X-Correlation-Id',
        'X-Correlation-Id': 'e2e-simulacao-backend-503'
      },
      body: JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Falha temporária simulada no servidor.', correlationId: 'e2e-simulacao-backend-503' })
    });
  });
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
  await expect(page.locator('#appointment-confirmation .state-card.error')).toContainText('Falha temporária simulada no servidor.');
  expect(intercepted).toBe(true);
  recorder.mark('resposta 503 simulada no navegador; nenhum dado foi enviado ao endpoint real');
  await recorder.screenshot('erro-de-servidor-simulado');

  await page.unroute('**/api/v1/appointments');
  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/appointments') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar agendamento' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  scenario.appointment = await response.json();
  await expect(page.getByRole('status')).toContainText('Agendamento criado.');

  const persisted = await pool.query('select status from appointment where id = $1', [scenario.appointment.id]);
  expect(persisted.rows[0]?.status).toBe('SCHEDULED');
  recorder.mark('tentativa seguinte chegou ao backend real e foi persistida', {
    appointmentId: scenario.appointment.id,
    status: persisted.rows[0].status
  });
  await recorder.screenshot('retry-real-persistido');
});

test('data passada não apresenta horários reserváveis', async ({ page, scenario, recorder }) => {
  await page.goto('/novo-agendamento/novo-agendamento.html');
  await page.locator('#schedule-query').fill(yesterdayLabel());
  await page.getByRole('button', { name: 'Pesquisar horários' }).click();
  await expect(page.locator('[data-slot-index]')).toHaveCount(0);
  await expect(page.locator('#schedule-results')).toContainText('Não foram encontrados horários disponíveis');
  recorder.mark('busca por data passada não retornou slots reserváveis');
  await recorder.screenshot('data-passada-sem-horarios');
});

async function prepareScenario(page, recorder, testInfo) {
  await page.addInitScript(url => { window.CLN_API_BASE_URL = url; }, apiBaseUrl);
  await page.goto('/login/login.html');
  await page.getByLabel('Usuário').fill(process.env.E2E_ADMIN_USERNAME || 'playwright-admin');
  await page.getByLabel('Senha').fill(process.env.E2E_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL('**/visao-geral/visao-geral.html'),
    page.getByRole('button', { name: 'Entrar' }).click()
  ]);
  recorder.mark('ADMIN autenticado pela tela de login', { page: 'login/login.html' });

  const database = await pool.query('select current_database() as name');
  const runId = randomUUID().replaceAll('-', '').slice(0, 8);
  const doctorName = `E2E Medico ${runId}`;
  const patientName = `E2E Paciente ${runId}`;
  const target = new Date();
  target.setDate(target.getDate() + 1);
  const dateKey = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  const dateLabel = `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}/${target.getFullYear()}`;
  const weekday = ((target.getDay() + 6) % 7) + 1;
  const startsAt = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 13, 0, 0).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString();

  const doctor = await apiCall(page, '/api/v1/doctors', 'POST', {
    fullName: doctorName,
    crm: `E2E${runId}`,
    crmState: 'SP',
    status: testInfo.title.toLowerCase().includes('médico inativo') ? 'INACTIVE' : 'ACTIVE',
    defaultAppointmentMinutes: 30,
    modality: 'PRESENCIAL'
  });
  const patient = await apiCall(page, '/api/v1/patients', 'POST', {
    fullName: patientName,
    birthDate: '1990-01-01'
  });
  await apiCall(page, `/api/v1/doctors/${doctor.body.id}/availability`, 'POST', {
    weekday,
    startsAt: '13:00',
    endsAt: '16:00',
    slotMinutes: 30
  });

  recorder.mark('pré-condições criadas em endpoints reais', {
    database: database.rows[0].name,
    doctorId: doctor.body.id,
    patientId: patient.body.id,
    date: dateKey,
    weekday,
    status: testInfo.title.toLowerCase().includes('médico inativo') ? 'INACTIVE' : 'ACTIVE'
  });
  return {
    databaseName: database.rows[0].name,
    doctorId: doctor.body.id,
    doctorStatus: testInfo.title.toLowerCase().includes('médico inativo') ? 'INACTIVE' : 'ACTIVE',
    patientId: patient.body.id,
    doctorName,
    patientName,
    dateLabel,
    startsAt,
    endsAt,
    appointment: null,
    competingAppointmentId: null,
    testTitle: testInfo.title
  };
}

async function cleanupScenario(scenario, recorder) {
  if (!scenario?.doctorId) return;
  await recorder.flush();
  const client = await pool.connect();
  await client.query('begin');
  try {
    const appointments = await client.query('select id from appointment where doctor_id = $1', [scenario.doctorId]);
    const appointmentIds = appointments.rows.map(row => row.id);
    const entityIds = [scenario.doctorId, scenario.patientId, ...appointmentIds];
    const correlationIds = recorder.events
      .filter(event => event.kind === 'network' && event.responseHeaders?.['x-correlation-id'])
      .map(event => event.responseHeaders['x-correlation-id']);
    await client.query('delete from audit_event where correlation_id = any($1::text[])', [correlationIds]);
    await client.query('delete from audit_event where entity_id = any($1::text[])', [entityIds]);
    await client.query('delete from notification_outbox where aggregate_id = any($1::uuid[])', [appointmentIds]);
    await client.query('delete from appointment_status_history where appointment_id = any($1::uuid[])', [appointmentIds]);
    await client.query('delete from appointment where doctor_id = $1', [scenario.doctorId]);
    await client.query('delete from schedule_block where doctor_id = $1', [scenario.doctorId]);
    await client.query('delete from doctor_availability where doctor_id = $1', [scenario.doctorId]);
    await client.query('delete from doctor_specialty where doctor_id = $1', [scenario.doctorId]);
    await client.query('delete from doctor where id = $1', [scenario.doctorId]);
    await client.query('delete from waitlist_entry where patient_id = $1', [scenario.patientId]);
    await client.query('delete from patient where id = $1', [scenario.patientId]);
    await client.query('commit');
    recorder.mark('fixtures sintéticas removidas do banco E2E', { removedAppointments: appointmentIds.length });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function apiCall(page, path, method, body) {
  const response = await page.evaluate(async ({ path, method, body, apiBaseUrl }) => {
    const session = JSON.parse(sessionStorage.getItem('clinicaHans.session') || 'null');
    const headers = { Authorization: `Bearer ${session?.accessToken || ''}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const result = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const raw = await result.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw; }
    return { status: result.status, body: parsed };
  }, { path, method, body, apiBaseUrl });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${method} ${path} falhou com HTTP ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response;
}

async function openScheduling(page, scenario) {
  await page.goto('/novo-agendamento/novo-agendamento.html');
  await page.locator('#schedule-query').fill(scenario.dateLabel);
  await page.getByRole('button', { name: 'Pesquisar horários' }).click();
}

async function selectPatient(page, patientName) {
  await page.locator('[data-slot-index="0"]').click();
  await page.locator('#patient-query').fill(patientName);
  await page.locator('[data-patient-id]').filter({ hasText: patientName }).click();
}

function appointmentPayload(scenario) {
  return {
    patientId: scenario.patientId,
    doctorId: scenario.doctorId,
    startsAt: scenario.startsAt,
    durationMinutes: 30,
    modality: 'PRESENCIAL'
  };
}

function yesterdayLabel() {
  const target = new Date();
  target.setDate(target.getDate() - 1);
  return `${String(target.getDate()).padStart(2, '0')}/${String(target.getMonth() + 1).padStart(2, '0')}/${target.getFullYear()}`;
}
