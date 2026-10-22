import { expect, test } from '@playwright/test';
import {
  callApiFromPage,
  ids,
  installFunctionalApi,
  samplePatient
} from './support/functional-mocks.mjs';

test('paciente: cadastro, pesquisa em cartões, ficha e atualização versionada', async ({ page }) => {
  const calls = await installFunctionalApi(page, { roles: ['RECEPCAO', 'ADMIN'] });
  await page.goto('/cadastro-paciente/cadastro-paciente.html');
  await page.getByLabel('Nome completo').fill('Paciente funcional E2E');
  await page.getByLabel('Nascimento').fill('1991-02-03');
  await page.getByLabel('Carteirinha do convênio').fill('PLANO-E2E-01');
  await page.getByLabel('Telefone').fill('11988887777');
  await page.getByLabel('E-mail').fill('paciente.e2e@example.invalid');

  const createRequestPromise = watchRequest(page, 'POST', '/api/v1/patients');
  await Promise.all([
    page.waitForURL(/\/ficha-paciente\/ficha-paciente\.html\?id=/),
    page.getByRole('button', { name: 'Cadastrar' }).click()
  ]);
  const createRequest = await createRequestPromise;
  expect(createRequest.postDataJSON()).toMatchObject({
    fullName: 'Paciente funcional E2E',
    birthDate: '1991-02-03',
    insuranceCard: 'PLANO-E2E-01',
    phone: '11988887777',
    email: 'paciente.e2e@example.invalid'
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Ficha administrativa do paciente' })).toBeVisible();

  await page.goto(`/pacientes/pacientes.html`);
  await page.locator('#q').fill('Paciente E2E');
  const searchRequestPromise = watchRequest(page, 'GET', '/api/v1/patients');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await searchRequestPromise;
  await expect(page.locator('#resultado .card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Abrir ficha' }).click();
  await expect(page.getByRole('heading', { level: 2, name: samplePatient.fullName })).toBeVisible();

  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Nome').fill('Paciente funcional E2E atualizado');
  await page.getByLabel('Telefone').fill('11977776666');
  const updateRequestPromise = watchRequest(page, 'PUT', `/api/v1/patients/${ids.patient}`);
  await Promise.all([
    page.waitForURL(new RegExp(`/ficha-paciente/ficha-paciente.html\\?id=${ids.patient}$`)),
    page.getByRole('button', { name: 'Salvar' }).click()
  ]);
  const updateRequest = await updateRequestPromise;
  expect(updateRequest.postDataJSON()).toMatchObject({
    fullName: 'Paciente funcional E2E atualizado',
    phone: '11977776666',
    version: 1
  });
  expect(calls.some(call => call.method === 'POST' && call.pathname === '/api/v1/patients')).toBe(true);
});

test('corpo clínico: cadastro, catálogo, disponibilidade, bloqueio e vínculo de usuário', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['GESTAO', 'ADMIN'] });
  await page.goto('/cadastro-medico/cadastro-medico.html');
  await page.getByLabel('Nome').fill('Médica funcional E2E');
  await page.getByLabel('CRM').fill('E2E54321');
  await page.getByLabel('UF').fill('SP');
  await page.getByLabel('Duração padrão').fill('30');
  const doctorRequestPromise = watchRequest(page, 'POST', '/api/v1/doctors');
  await Promise.all([
    page.waitForURL(/\/detalhe-medico\/detalhe-medico\.html\?id=/),
    page.getByRole('button', { name: 'Cadastrar' }).click()
  ]);
  expect((await doctorRequestPromise).postDataJSON()).toMatchObject({
    fullName: 'Médica funcional E2E', crm: 'E2E54321', crmState: 'SP', defaultAppointmentMinutes: 30
  });

  await page.goto('/especialidades/especialidades.html');
  await page.getByLabel('Nome').fill('Especialidade funcional E2E');
  await page.getByLabel('Sistema externo').fill('SIGTAP');
  await page.getByLabel('Código').fill('E2E-77');
  const specialtyRequestPromise = watchRequest(page, 'POST', '/api/v1/doctors/specialties');
  await page.getByRole('button', { name: 'Cadastrar' }).click();
  expect((await specialtyRequestPromise).postDataJSON()).toEqual({
    name: 'Especialidade funcional E2E', externalSystem: 'SIGTAP', externalCode: 'E2E-77'
  });
  const specialtyLinkPromise = watchRequest(page, 'POST', `/api/v1/doctors/${ids.doctor}/specialties/${ids.specialty}`);
  const specialtyLink = await callApiFromPage(page, 'POST', `/api/v1/doctors/${ids.doctor}/specialties/${ids.specialty}?primary=true`);
  expect(specialtyLink.status).toBe(200);
  expect(new URL((await specialtyLinkPromise).url()).searchParams.get('primary')).toBe('true');

  await page.goto(`/disponibilidade-medica/disponibilidade-medica.html?id=${ids.doctor}`);
  await page.getByLabel('Dia (1-7)').fill('2');
  await page.getByLabel('Início').fill('09:00');
  await page.getByLabel('Fim').fill('12:00');
  await page.getByLabel('Slot').fill('30');
  const availabilityRequestPromise = watchRequest(page, 'POST', `/api/v1/doctors/${ids.doctor}/availability`);
  await page.getByRole('button', { name: 'Adicionar' }).click();
  expect((await availabilityRequestPromise).postDataJSON()).toMatchObject({
    weekday: 2, startsAt: '09:00', endsAt: '12:00', slotMinutes: 30
  });

  await page.goto(`/bloqueios-agenda/bloqueios-agenda.html?id=${ids.doctor}`);
  await page.getByLabel('Início').fill('2030-10-22T10:00');
  await page.getByLabel('Fim').fill('2030-10-22T11:00');
  await page.getByLabel('Motivo').fill('Bloqueio funcional E2E');
  const blockRequestPromise = watchRequest(page, 'POST', `/api/v1/doctors/${ids.doctor}/blocks`);
  await page.getByRole('button', { name: 'Bloquear' }).click();
  expect((await blockRequestPromise).postDataJSON()).toMatchObject({ reason: 'Bloqueio funcional E2E' });

  await page.goto(`/vinculo-usuario-medico/vinculo-usuario-medico.html?id=${ids.doctor}`);
  await page.getByLabel('Usuário').selectOption(ids.user);
  const linkRequestPromise = watchRequest(page, 'POST', `/api/v1/doctors/${ids.doctor}/user-link`);
  await page.getByRole('button', { name: 'Vincular' }).click();
  expect((await linkRequestPromise).postDataJSON()).toEqual({ userId: ids.user });
});

test('administração de usuários: criar com múltiplos perfis e desativar', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['ADMIN'] });
  await page.goto('/criar-usuario/criar-usuario.html');
  await page.getByLabel('Usuário').fill('e2e-medico-funcional');
  await page.getByLabel('Senha').fill('senha-local-e2e-123');
  await page.locator('input[name="roles"][value="MEDICO"]').check();
  await page.locator('input[name="roles"][value="RECEPCAO"]').check();
  const createRequestPromise = watchRequest(page, 'POST', '/api/v1/admin/users');
  await Promise.all([
    page.waitForURL(/\/usuarios\/usuarios\.html$/),
    page.getByRole('button', { name: 'Criar usuário' }).click()
  ]);
  expect((await createRequestPromise).postDataJSON()).toMatchObject({
    username: 'e2e-medico-funcional',
    password: 'senha-local-e2e-123',
    roles: ['MEDICO', 'RECEPCAO']
  });

  await page.getByRole('link', { name: 'Desativar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'e2e-existing-user' })).toBeVisible();
  const deactivateRequestPromise = watchRequest(page, 'POST', `/api/v1/admin/users/${ids.user}/deactivate`);
  await Promise.all([
    page.waitForURL(/\/usuarios\/usuarios\.html$/),
    page.getByRole('button', { name: 'Desativar usuário' }).click()
  ]);
  await deactivateRequestPromise;
  await expect(page.locator('#screen-root table tbody tr').first()).toBeVisible();
});

test('prontuário e atendimento: segurança, registros clínicos, rascunho, finalização e adendo', async ({ page }) => {
  const calls = await installFunctionalApi(page, { roles: ['MEDICO'], username: 'e2e-medico' });

  await page.goto(`/prontuario/prontuario.html?patientId=${ids.patient}`);
  await expect(page.locator('#screen-root')).toContainText('Alertas');
  await page.goto(`/safety-snapshot/safety-snapshot.html?patientId=${ids.patient}`);
  await expect(page.locator('#screen-root')).toContainText('Substância sintética');
  await page.goto(`/linha-tempo/linha-tempo.html?patientId=${ids.patient}`);
  await expect(page.locator('#screen-root .timeline-item')).toHaveCount(1);

  await page.goto(`/alergias-alertas/alergias-alertas.html?patientId=${ids.patient}`);
  await page.getByLabel('Substância').fill('Penicilina sintética');
  await page.getByLabel('Reação').fill('Reação sintética');
  await page.getByLabel('Severidade').first().selectOption('CRITICAL');
  const allergyPromise = watchRequest(page, 'POST', `/api/v1/clinical/patients/${ids.patient}/allergies`);
  await page.getByRole('button', { name: 'Registrar' }).first().click();
  expect((await allergyPromise).postDataJSON()).toMatchObject({ substance: 'Penicilina sintética', reaction: 'Reação sintética', severity: 'CRITICAL' });

  await page.getByLabel('Tipo').fill('ALERGIA');
  await page.getByLabel('Severidade').nth(1).selectOption('HIGH');
  await page.getByLabel('Mensagem').fill('Alerta funcional E2E');
  const alertPromise = watchRequest(page, 'POST', `/api/v1/clinical/patients/${ids.patient}/alerts`);
  await page.getByRole('button', { name: 'Registrar' }).nth(1).click();
  expect((await alertPromise).postDataJSON()).toMatchObject({ type: 'ALERGIA', severity: 'HIGH', message: 'Alerta funcional E2E' });

  const deactivatePromise = watchRequest(page, 'DELETE', `/api/v1/clinical/patients/${ids.patient}/alerts/${ids.result}`);
  await page.locator('[data-off]').first().click();
  await deactivatePromise;

  await page.goto(`/medicamentos/medicamentos.html?patientId=${ids.patient}`);
  await page.getByLabel('Nome').fill('Medicamento funcional');
  await page.getByLabel('Dose').fill('10 mg');
  await page.getByLabel('Frequência').fill('1 vez ao dia');
  await page.getByLabel('Início').fill('2030-10-21');
  const medicationPromise = watchRequest(page, 'POST', `/api/v1/clinical/patients/${ids.patient}/medications`);
  await page.getByRole('button', { name: 'Registrar medicamento' }).click();
  expect((await medicationPromise).postDataJSON()).toMatchObject({ name: 'Medicamento funcional', dosage: '10 mg', frequency: '1 vez ao dia' });

  await page.goto(`/condicoes-clinicas/condicoes-clinicas.html?patientId=${ids.patient}`);
  await page.getByLabel('Descrição').fill('Condição funcional');
  await page.getByLabel('Status').selectOption('CONTROLLED');
  const conditionPromise = watchRequest(page, 'POST', `/api/v1/clinical/patients/${ids.patient}/conditions`);
  await page.getByRole('button', { name: 'Registrar condição' }).click();
  expect((await conditionPromise).postDataJSON()).toMatchObject({ description: 'Condição funcional', status: 'CONTROLLED' });

  await page.goto(`/documentos-clinicos/documentos-clinicos.html?patientId=${ids.patient}`);
  await page.getByLabel('Tipo').fill('Laudo funcional');
  await page.getByLabel('Storage key').fill('e2e/documento-funcional.pdf');
  const documentPromise = watchRequest(page, 'POST', `/api/v1/clinical/patients/${ids.patient}/documents`);
  await page.getByRole('button', { name: 'Registrar documento' }).click();
  expect((await documentPromise).postDataJSON()).toMatchObject({ documentType: 'Laudo funcional', storageKey: 'e2e/documento-funcional.pdf', mimeType: 'application/pdf' });

  await page.goto(`/atendimento/atendimento.html?appointmentId=${ids.appointment}`);
  await page.getByLabel('Agendamento em CHECKED_IN').fill(ids.appointment);
  const startPromise = watchRequest(page, 'POST', '/api/v1/clinical/encounters/start');
  await Promise.all([
    page.waitForURL(new RegExp(`/salvar-rascunho/salvar-rascunho.html\\?id=${ids.encounter}&version=1$`)),
    page.getByRole('button', { name: 'Iniciar atendimento' }).click()
  ]);
  expect((await startPromise).postDataJSON()).toEqual({ appointmentId: ids.appointment });

  await page.getByLabel('Queixa').fill('Queixa sintética');
  await page.getByLabel('Avaliação').fill('Avaliação sintética');
  await page.getByLabel('Plano').fill('Plano sintético');
  const draftPromise = watchRequest(page, 'PUT', `/api/v1/clinical/encounters/${ids.encounter}/draft`);
  await Promise.all([
    page.waitForURL(new RegExp(`/finalizar-atendimento/finalizar-atendimento.html\\?id=${ids.encounter}&version=2$`)),
    page.getByRole('button', { name: 'Salvar rascunho' }).click()
  ]);
  expect((await draftPromise).postDataJSON()).toMatchObject({ chiefComplaint: 'Queixa sintética', assessment: 'Avaliação sintética', plan: 'Plano sintético', version: 1 });

  const finalizePromise = watchRequest(page, 'POST', `/api/v1/clinical/encounters/${ids.encounter}/finalize`);
  await page.getByRole('button', { name: 'Finalizar atendimento' }).click();
  expect((await finalizePromise).postDataJSON()).toEqual({ version: 2 });
  await page.getByRole('link', { name: 'Criar adendo' }).click();
  await page.getByLabel('Motivo').fill('Correção formal sintética');
  await page.getByLabel('Conteúdo').fill('Conteúdo complementar sintético');
  const addendumPromise = watchRequest(page, 'POST', `/api/v1/clinical/encounters/${ids.encounter}/addenda`);
  await page.getByRole('button', { name: 'Registrar adendo' }).click();
  expect((await addendumPromise).postDataJSON()).toEqual({ reason: 'Correção formal sintética', content: 'Conteúdo complementar sintético' });

  expect(calls.filter(call => call.pathname.startsWith('/api/v1/clinical/')).length).toBeGreaterThan(10);
});

test('exames e continuidade: solicitar, receber e revisar resultado; criar e concluir follow-up', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['MEDICO'] });

  await page.goto(`/solicitar-exame/solicitar-exame.html?encounterId=${ids.encounter}`);
  await page.getByLabel('Exame').fill('Hemograma funcional');
  await page.getByLabel('Prioridade').selectOption('URGENT');
  const requestedExamPromise = watchRequest(page, 'POST', '/api/v1/continuity/exams');
  await Promise.all([
    page.waitForURL(/\/exames\/exames\.html$/),
    page.getByRole('button', { name: 'Solicitar' }).click()
  ]);
  expect((await requestedExamPromise).postDataJSON()).toMatchObject({ encounterId: ids.encounter, examName: 'Hemograma funcional', priority: 'URGENT' });
  await expect(page.locator('#screen-root table tbody tr').first()).toBeVisible();

  await page.getByRole('link', { name: 'Revisar' }).click();
  await page.getByLabel('Nota').fill('Resultado revisado em teste funcional');
  const reviewPromise = watchRequest(page, 'POST', `/api/v1/continuity/results/${ids.result}/review`);
  await Promise.all([
    page.waitForURL(/\/exames\/exames\.html$/),
    page.getByRole('button', { name: 'Marcar como revisado' }).click()
  ]);
  expect((await reviewPromise).postDataJSON()).toEqual({ note: 'Resultado revisado em teste funcional' });

  await page.goto(`/novo-exame/novo-exame.html?encounterId=${ids.encounter}`);
  await page.getByLabel('Atendimento').fill(ids.encounter);
  await page.getByLabel('Exame').fill('Raio X funcional');
  const newExamPromise = watchRequest(page, 'POST', '/api/v1/continuity/exams');
  await Promise.all([
    page.waitForURL(/\/exames\/exames\.html$/),
    page.getByRole('button', { name: 'Solicitar' }).click()
  ]);
  expect((await newExamPromise).postDataJSON()).toMatchObject({ examName: 'Raio X funcional', encounterId: ids.encounter });

  await page.goto(`/receber-resultado/receber-resultado.html?id=${ids.exam}`);
  await page.getByLabel('Storage key').fill('e2e/resultado-funcional.pdf');
  const receivedPromise = watchRequest(page, 'POST', `/api/v1/continuity/exams/${ids.exam}/result`);
  await Promise.all([
    page.waitForURL(new RegExp(`/revisar-resultado/revisar-resultado.html\\?id=${ids.exam}$`)),
    page.getByRole('button', { name: 'Registrar resultado' }).click()
  ]);
  expect((await receivedPromise).postDataJSON()).toMatchObject({ storageKey: 'e2e/resultado-funcional.pdf', mimeType: 'application/pdf' });

  await page.goto(`/novo-acompanhamento/novo-acompanhamento.html?patientId=${ids.patient}&encounterId=${ids.encounter}`);
  await page.getByLabel('Paciente').fill(ids.patient);
  await page.getByLabel('Atendimento').fill(ids.encounter);
  await page.getByLabel('Motivo').fill('Retorno funcional E2E');
  await page.getByLabel('Prioridade').selectOption('HIGH');
  const followUpPromise = watchRequest(page, 'POST', '/api/v1/continuity/follow-ups');
  await Promise.all([
    page.waitForURL(/\/retornos\/retornos\.html$/),
    page.getByRole('button', { name: 'Criar' }).click()
  ]);
  expect((await followUpPromise).postDataJSON()).toMatchObject({ patientId: ids.patient, encounterId: ids.encounter, reason: 'Retorno funcional E2E', priority: 'HIGH' });

  await page.getByRole('link', { name: 'Registrar ação' }).click();
  await page.getByLabel('Tipo').fill('CONTATO_REALIZADO');
  await page.getByLabel('Nota').fill('Paciente contatado em ambiente de teste');
  await page.getByLabel('Concluir').selectOption('true');
  const actionPromise = watchRequest(page, 'POST', `/api/v1/continuity/follow-ups/${ids.followUp}/actions`);
  await Promise.all([
    page.waitForURL(/\/retornos\/retornos\.html$/),
    page.getByRole('button', { name: 'Registrar ação' }).click()
  ]);
  expect((await actionPromise).postDataJSON()).toMatchObject({ actionType: 'CONTATO_REALIZADO', note: 'Paciente contatado em ambiente de teste', close: true });
});

test('fila de espera: criar entrada de preparação e converter pela tela em agendamento', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['RECEPCAO', 'ADMIN'] });
  await page.goto('/login/login.html');
  const create = await callApiFromPage(page, 'POST', '/api/v1/waitlist', {
    patientId: ids.patient,
    doctorId: ids.doctor,
    specialtyId: null,
    preferredFrom: '2030-10-21T12:30:00-03:00',
    preferredTo: '2030-10-21T14:00:00-03:00',
    priority: 'HIGH'
  });
  expect(create.status).toBe(200);

  await page.goto('/fila-espera/fila-espera.html');
  await expect(page.locator('#screen-root table tbody tr')).toContainText('HIGH');
  await page.getByRole('link', { name: 'Converter' }).click();
  await page.getByLabel('Médico').selectOption(ids.doctor);
  await page.getByLabel('Data/hora').fill('2030-10-21T13:30');
  await page.getByLabel('Duração').fill('30');
  const convertPromise = watchRequest(page, 'POST', `/api/v1/waitlist/${ids.waitlist}/convert`);
  await Promise.all([
    page.waitForURL(/\/fila-espera\/fila-espera\.html$/),
    page.getByRole('button', { name: 'Converter' }).click()
  ]);
  expect((await convertPromise).postDataJSON()).toMatchObject({ doctorId: ids.doctor, durationMinutes: 30, modality: 'PRESENCIAL' });
});

test('financeiro, indicadores e auditoria: lançar pagamento, filtrar e abrir detalhe', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['GESTAO', 'ADMIN'] });
  await page.goto(`/novo-recebivel/novo-recebivel.html?encounterId=${ids.encounter}`);
  await page.getByLabel('Atendimento finalizado').fill(ids.encounter);
  await page.getByLabel('Pagador').selectOption('INSURANCE');
  await page.getByLabel('Referência').fill('Plano sintético');
  await page.getByLabel('Valor').fill('275.50');
  await page.getByLabel('Vencimento').fill('2030-10-31');
  const receivablePromise = watchRequest(page, 'POST', '/api/v1/finance/receivables');
  await Promise.all([
    page.waitForURL(/\/faturamento\/faturamento\.html$/),
    page.getByRole('button', { name: 'Criar recebível' }).click()
  ]);
  expect((await receivablePromise).postDataJSON()).toMatchObject({
    encounterId: ids.encounter, payerType: 'INSURANCE', payerReference: 'Plano sintético', amount: 275.5, dueDate: '2030-10-31'
  });
  await expect(page.locator('#screen-root table tbody tr').first()).toBeVisible();

  await page.getByRole('link', { name: 'Pagamento' }).click();
  await page.getByLabel('Valor').fill('100.25');
  await page.getByLabel('Forma').fill('PIX');
  const paymentPromise = watchRequest(page, 'POST', `/api/v1/finance/receivables/${ids.receivable}/payments`);
  await Promise.all([
    page.waitForURL(/\/faturamento\/faturamento\.html$/),
    page.getByRole('button', { name: 'Registrar pagamento' }).click()
  ]);
  expect((await paymentPromise).postDataJSON()).toEqual({ amount: 100.25, method: 'PIX' });

  await page.goto('/indicadores/indicadores.html');
  await expect(page.locator('#screen-root .metric-card')).toHaveCount(4);
  await page.goto('/auditoria/auditoria.html');
  await page.getByRole('link', { name: 'Pesquisa avançada' }).click();
  await page.getByLabel('Tipo da entidade').fill('PATIENT');
  await page.getByLabel('ID da entidade').fill(ids.patient);
  const auditPromise = watchRequest(page, 'GET', '/api/v1/audit');
  await page.getByRole('button', { name: 'Pesquisar' }).click();
  await auditPromise;
  await expect(page.locator('#results table tbody tr').first()).toBeVisible();

  await page.goto(`/detalhe-auditoria/detalhe-auditoria.html?entityType=PATIENT&entityId=${ids.patient}`);
  await expect(page.locator('#screen-root table tbody tr')).toContainText('E2E_TEST_ACTION');
});

function watchRequest(page, method, pathname) {
  return page.waitForRequest(request => {
    const url = new URL(request.url());
    return request.method() === method && url.pathname === pathname;
  });
}


