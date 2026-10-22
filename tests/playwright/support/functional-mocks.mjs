export const ids = {
  patient: '11111111-1111-4111-8111-111111111111',
  doctor: '22222222-2222-4222-8222-222222222222',
  appointment: '33333333-3333-4333-8333-333333333333',
  encounter: '44444444-4444-4444-8444-444444444444',
  exam: '55555555-5555-4555-8555-555555555555',
  pendingExam: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  result: '66666666-6666-4666-8666-666666666666',
  followUp: '77777777-7777-4777-8777-777777777777',
  receivable: '88888888-8888-4888-8888-888888888888',
  user: '99999999-9999-4999-8999-999999999999',
  waitlist: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  specialty: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
};

const futureStart = '2030-10-21T13:00:00-03:00';
const futureEnd = '2030-10-21T13:30:00-03:00';

export const samplePatient = {
  id: ids.patient,
  fullName: 'Paciente E2E Sintético',
  cpf: '',
  insuranceCard: 'E2E-TESTE',
  birthDate: '1990-01-01',
  phone: '11900000000',
  email: 'e2e@example.invalid',
  version: 1
};

export const sampleDoctor = {
  id: ids.doctor,
  fullName: 'Médico E2E Sintético',
  crm: 'E2E12345',
  crmState: 'SP',
  rqe: 'E2E-01',
  status: 'ACTIVE',
  defaultAppointmentMinutes: 30,
  modality: 'PRESENCIAL'
};

export const sampleAppointment = {
  appointmentId: ids.appointment,
  patientId: ids.patient,
  doctorId: ids.doctor,
  startsAt: futureStart,
  endsAt: futureEnd,
  doctorName: sampleDoctor.fullName,
  specialtyName: 'Clínica geral',
  maskedPatientName: 'P***** E2E',
  status: 'SCHEDULED'
};

export const sampleSnapshot = {
  alerts: [{ id: ids.result, type: 'ALERGIA', severity: 'HIGH', message: 'Alerta sintético de teste' }],
  allergies: [{ id: ids.result, substance: 'Substância sintética', reaction: 'Reação de teste', severity: 'HIGH' }],
  medications: [{ id: ids.result, name: 'Medicamento sintético', dosage: '1 comprimido', frequency: '1x ao dia' }],
  conditions: [{ id: ids.result, description: 'Condição sintética', status: 'ACTIVE' }]
};

export const sampleAudit = {
  method: 'GET',
  route: '/api/v1/health',
  status: 200,
  durationMs: 12,
  occurredAt: futureStart,
  username: 'e2e-admin',
  sourceIp: '127.0.0.1',
  action: 'E2E_TEST_ACTION',
  requestMethod: 'GET',
  requestPath: '/api/v1/e2e',
  entityType: 'PATIENT',
  entityId: ids.patient,
  outcome: 'SUCCESS',
  httpStatus: 200,
  correlationId: 'e2e-correlation-id',
  previousValues: null
};

export async function installFunctionalApi(page, {
  roles = ['ADMIN', 'MEDICO', 'RECEPCAO', 'GESTAO'],
  username = 'e2e-user',
  override,
  session = true
} = {}) {
  const calls = [];
  await page.addInitScript(({ apiBaseUrl, session, authenticated }) => {
    window.CLN_API_BASE_URL = apiBaseUrl;
    if (authenticated && sessionStorage.getItem('functional-playwright-initialized') !== 'true') {
      sessionStorage.setItem('clinicaHans.session', JSON.stringify(session));
      sessionStorage.setItem('functional-playwright-initialized', 'true');
    }
  }, {
    apiBaseUrl: `http://127.0.0.1:${process.env.E2E_API_PORT || 8081}`,
    session: { accessToken: 'functional-playwright-token', roles, username },
    authenticated: session
  });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const requestHeaders = request.headers();
    const corsHeaders = {
      'Access-Control-Allow-Origin': requestHeaders.origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Expose-Headers': 'X-Correlation-Id',
      'Access-Control-Max-Age': '600'
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    let body = null;
    try { body = request.postDataJSON(); } catch { /* chamadas sem corpo, como desativar usuário */ }
    const call = {
      method: request.method(),
      pathname: url.pathname,
      search: url.search,
      body
    };
    calls.push(call);

    const overrideResult = await override?.(call);
    if (overrideResult !== undefined && overrideResult !== null) {
      await route.fulfill({
        status: overrideResult.status ?? 200,
        contentType: 'application/json',
        headers: { ...corsHeaders, ...overrideResult.headers },
        body: JSON.stringify(overrideResult.body ?? {})
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { ...corsHeaders, 'X-Correlation-Id': 'e2e-functional-mock' },
      body: JSON.stringify(mockResponse(call))
    });
  });
  return calls;
}

export async function callApiFromPage(page, method, pathname, body) {
  return page.evaluate(async ({ method, pathname, body }) => {
    const session = JSON.parse(sessionStorage.getItem('clinicaHans.session') || 'null');
    const response = await fetch(`${window.CLN_API_BASE_URL}${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${session?.accessToken || ''}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { method, pathname, body });
}

function mockResponse({ method, pathname, body }) {
  if (method === 'GET') {
    if (pathname === '/api/v1/public/operations') return [sampleAudit];
    if (pathname === '/api/v1/patients/smart-search') return { patients: [samplePatient] };
    if (pathname === '/api/v1/patients') return [samplePatient];
    if (pathname === `/api/v1/patients/${ids.patient}`) return samplePatient;
    if (pathname.startsWith('/api/v1/patients/')) return samplePatient;

    if (pathname === '/api/v1/doctors/specialties') return [{ id: ids.specialty, name: 'Clínica geral', externalSystem: 'SIGTAP', externalCode: 'E2E' }];
    if (pathname === '/api/v1/doctors') return [sampleDoctor];
    if (pathname === `/api/v1/doctors/${ids.doctor}`) return sampleDoctor;
    if (pathname.startsWith(`/api/v1/doctors/${ids.doctor}/availability`)) return [{ weekday: 1, startsAt: '13:00', endsAt: '16:00', slotMinutes: 30 }];
    if (pathname.startsWith(`/api/v1/doctors/${ids.doctor}/blocks`)) return [];

    if (pathname === '/api/v1/appointments/smart-search') {
      return {
        criteria: { date: '2030-10-21', doctor: sampleDoctor.fullName, specialty: null, weekday: null, period: null, time: null },
        slots: [{ doctorId: ids.doctor, doctorName: sampleDoctor.fullName, specialtyName: 'Clínica geral', startsAt: futureStart, endsAt: futureEnd, status: 'AVAILABLE' }],
        appointments: []
      };
    }
    if (pathname === '/api/v1/appointments/calendar' || pathname === '/api/v1/appointments') return [sampleAppointment];
    if (pathname.startsWith('/api/v1/appointments/')) return sampleAppointment;
    if (pathname === '/api/v1/waitlist') return [{ id: ids.waitlist, patientId: ids.patient, doctorId: ids.doctor, preferredFrom: futureStart, preferredTo: futureEnd, priority: 'HIGH' }];

    if (pathname.includes('/safety-snapshot')) return sampleSnapshot;
    if (pathname.endsWith('/timeline')) return [{ type: 'ENCOUNTER', title: 'Atendimento sintético', occurredAt: futureStart }];
    if (pathname.endsWith('/documents')) return [{ id: ids.result, documentType: 'Laudo sintético', mimeType: 'application/pdf', storageKey: 'e2e/teste.pdf' }];

    if (pathname === '/api/v1/continuity/exams/pending') return [
      { id: ids.exam, examName: 'Hemograma sintético', status: 'RESULT_RECEIVED' },
      { id: ids.pendingExam, examName: 'Exame pendente sintético', status: 'ORDERED' }
    ];
    if (pathname === `/api/v1/continuity/exams/${ids.exam}/result`) return { id: ids.result, storageKey: 'e2e/resultado.pdf', mimeType: 'application/pdf' };
    if (pathname === '/api/v1/continuity/follow-ups/operational') return [{ id: ids.followUp, patientName: samplePatient.fullName, status: 'OPEN', dueAt: futureStart }];

    if (pathname === '/api/v1/finance/receivables') return [{ id: ids.receivable, encounterId: ids.encounter, amount: 150, status: 'OPEN', dueDate: '2030-10-31' }];
    if (pathname === '/api/v1/management/dashboard') return { appointments: 4, noShowRate: 2.5, cancelled: 1, openFollowUps: 2, grossReceivables: 600 };
    if (pathname === '/api/v1/admin/users') return [{ id: ids.user, username: 'e2e-existing-user', roles: ['RECEPCAO'], active: true }];
    if (pathname === '/api/v1/admin/users/roles') return ['ADMIN', 'MEDICO', 'RECEPCAO', 'GESTAO'];
    if (pathname === '/api/v1/audit') return [sampleAudit];
    return [];
  }

  if (pathname === '/api/v1/patients') return { ...samplePatient, ...body, id: ids.patient, version: 1 };
  if (pathname === '/api/v1/doctors') return { ...sampleDoctor, ...body, id: ids.doctor };
  if (pathname === '/api/v1/doctors/specialties') return { id: ids.specialty, ...body };
  if (pathname === '/api/v1/auth/login') return { accessToken: 'functional-login-token', roles: ['ADMIN'] };
  if (pathname === '/api/v1/clinical/encounters/start') return { id: ids.encounter, version: 1, status: 'DRAFT' };
  if (pathname === '/api/v1/clinical/encounters/' + ids.encounter + '/draft') return { id: ids.encounter, version: 2, status: 'DRAFT' };
  if (pathname === '/api/v1/admin/users') return { id: ids.user, username: body?.username, roles: body?.roles, active: true };
  if (pathname === `/api/v1/continuity/exams/${ids.exam}/result`) return { id: ids.result, ...body };
  if (pathname === '/api/v1/continuity/exams') return { id: ids.exam, ...body, status: 'ORDERED' };
  if (pathname === '/api/v1/finance/receivables') return { id: ids.receivable, ...body, status: 'OPEN' };
  if (pathname.startsWith('/api/v1/waitlist/') && pathname.endsWith('/convert')) return { ...sampleAppointment, ...body };
  return { id: ids.result, ...body };
}
