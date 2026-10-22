import { expect, test } from '@playwright/test';
import { ids, installFunctionalApi } from './support/functional-mocks.mjs';

const screens = [
  ['visao-geral/visao-geral.html', 'Visão geral'],
  ['agenda/agenda.html', 'Agenda'],
  ['novo-agendamento/novo-agendamento.html', 'Novo agendamento'],
  ['fila-espera/fila-espera.html', 'Fila de espera'],
  [`converter-fila/converter-fila.html?id=${ids.waitlist}`, 'Converter fila em agendamento'],
  ['pacientes/pacientes.html', 'Pacientes'],
  ['cadastro-paciente/cadastro-paciente.html', 'Cadastro de paciente'],
  [`ficha-paciente/ficha-paciente.html?id=${ids.patient}`, 'Ficha administrativa do paciente'],
  [`editar-paciente/editar-paciente.html?id=${ids.patient}`, 'Editar paciente'],
  ['medicos/medicos.html', 'Médicos'],
  ['cadastro-medico/cadastro-medico.html', 'Cadastro de médico'],
  [`detalhe-medico/detalhe-medico.html?id=${ids.doctor}`, 'Detalhe do médico'],
  ['especialidades/especialidades.html', 'Especialidades'],
  [`disponibilidade-medica/disponibilidade-medica.html?id=${ids.doctor}`, 'Disponibilidade médica'],
  [`bloqueios-agenda/bloqueios-agenda.html?id=${ids.doctor}`, 'Bloqueios de agenda'],
  [`vinculo-usuario-medico/vinculo-usuario-medico.html?id=${ids.doctor}`, 'Vínculo usuário e médico'],
  [`prontuario/prontuario.html?patientId=${ids.patient}`, 'Prontuário integrado'],
  [`safety-snapshot/safety-snapshot.html?patientId=${ids.patient}`, 'Safety snapshot'],
  [`linha-tempo/linha-tempo.html?patientId=${ids.patient}`, 'Linha do tempo'],
  [`alergias-alertas/alergias-alertas.html?patientId=${ids.patient}`, 'Alergias e alertas'],
  [`medicamentos/medicamentos.html?patientId=${ids.patient}`, 'Medicamentos'],
  [`condicoes-clinicas/condicoes-clinicas.html?patientId=${ids.patient}`, 'Condições clínicas'],
  [`documentos-clinicos/documentos-clinicos.html?patientId=${ids.patient}`, 'Documentos clínicos'],
  [`atendimento/atendimento.html?appointmentId=${ids.appointment}`, 'Atendimento clínico'],
  [`salvar-rascunho/salvar-rascunho.html?id=${ids.encounter}&version=1`, 'Salvar rascunho'],
  [`finalizar-atendimento/finalizar-atendimento.html?id=${ids.encounter}&version=1`, 'Finalizar atendimento'],
  [`adendo/adendo.html?id=${ids.encounter}`, 'Adendo ao atendimento'],
  [`solicitar-exame/solicitar-exame.html?encounterId=${ids.encounter}`, 'Solicitar exame'],
  [`criar-followup/criar-followup.html?patientId=${ids.patient}&encounterId=${ids.encounter}`, 'Criar follow-up'],
  ['exames/exames.html', 'Exames pendentes'],
  [`novo-exame/novo-exame.html?encounterId=${ids.encounter}`, 'Novo exame'],
  [`receber-resultado/receber-resultado.html?id=${ids.exam}`, 'Receber resultado'],
  [`revisar-resultado/revisar-resultado.html?id=${ids.exam}`, 'Revisar resultado'],
  ['retornos/retornos.html', 'Acompanhamentos e retornos'],
  ['novo-acompanhamento/novo-acompanhamento.html', 'Novo acompanhamento'],
  [`registrar-acao/registrar-acao.html?id=${ids.followUp}`, 'Registrar ação de acompanhamento'],
  ['faturamento/faturamento.html', 'Faturamento'],
  [`novo-recebivel/novo-recebivel.html?encounterId=${ids.encounter}`, 'Novo recebível'],
  [`registrar-pagamento/registrar-pagamento.html?id=${ids.receivable}`, 'Registrar pagamento'],
  ['indicadores/indicadores.html', 'Indicadores'],
  ['usuarios/usuarios.html', 'Usuários'],
  ['criar-usuario/criar-usuario.html', 'Criar usuário'],
  [`desativar-usuario/desativar-usuario.html?id=${ids.user}`, 'Desativar usuário'],
  ['auditoria/auditoria.html', 'Auditoria'],
  ['pesquisa-auditoria/pesquisa-auditoria.html', 'Pesquisa de auditoria'],
  [`detalhe-auditoria/detalhe-auditoria.html?entityType=PATIENT&entityId=${ids.patient}`, 'Detalhe de auditoria'],
  ['logs-publicos/logs-publicos.html', 'Registros técnicos recentes', false]
].map(([path, title, hasScreenRoot = true]) => ({ path, title, hasScreenRoot }));

screens.push({ path: 'login/login.html', title: 'Acessar sistema', hasScreenRoot: false });

test('todas as telas físicas abrem e exibem o conteúdo principal correspondente', async ({ page }) => {
  test.setTimeout(120_000);
  await installFunctionalApi(page);

  for (const screen of screens) {
    await test.step(`${screen.title}: ${screen.path.split('?')[0]}`, async () => {
      if (screen.path.startsWith('login/')) {
        await page.evaluate(() => sessionStorage.removeItem('clinicaHans.session'));
      }
      await page.goto(`/${screen.path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1, name: screen.title })).toBeVisible();

      if (screen.hasScreenRoot) {
        const root = page.locator('#screen-root');
        await expect(root).toBeVisible();
        await expect.poll(() => root.evaluate(element => element.childElementCount)).toBeGreaterThan(0);
        await expect(root.locator('.state-card.error')).toHaveCount(0);
      } else if (screen.path.startsWith('logs-publicos/')) {
        await expect(page.locator('#logs-table')).toBeVisible();
      } else {
        await expect(page.locator('#login-form')).toBeVisible();
      }
    });
  }
});

test('listagens exibem os formatos de cartões, tabelas, timeline e indicadores', async ({ page }) => {
  const calls = await installFunctionalApi(page);

  await page.goto('/pacientes/pacientes.html');
  await expect(page.locator('#resultado .card')).toHaveCount(1);
  await expect(page.locator('#resultado')).toContainText('Paciente E2E Sintético');

  await page.goto('/medicos/medicos.html');
  await expect(page.locator('#resultado .card')).toHaveCount(1);
  await expect(page.locator('#resultado')).toContainText('Médico E2E Sintético');

  for (const path of [
    '/fila-espera/fila-espera.html',
    '/exames/exames.html',
    '/retornos/retornos.html',
    '/faturamento/faturamento.html',
    '/usuarios/usuarios.html',
    '/auditoria/auditoria.html'
  ]) {
    await page.goto(path);
    await expect(page.locator('#screen-root table tbody tr').first()).toBeVisible();
  }

  await page.goto(`/linha-tempo/linha-tempo.html?patientId=${ids.patient}`);
  await expect(page.locator('#screen-root .timeline-item')).toHaveCount(1);

  await page.goto('/indicadores/indicadores.html');
  await expect(page.locator('#screen-root .metric-card')).toHaveCount(4);

  await page.goto('/exames/exames.html');
  await expect(page.getByRole('link', { name: 'Revisar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Receber resultado' })).toBeVisible();

  await page.goto('/logs-publicos/logs-publicos.html');
  await expect(page.locator('#logs-table table tbody tr')).toHaveCount(1);
  await expect(page.locator('#logs-table')).not.toContainText(/username|correlationId|patientId/i);
  await expect(page.locator('#logs-table')).not.toContainText('e2e-admin');
  const refreshPromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/public/operations');
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await refreshPromise;
  expect(calls.filter(call => call.pathname === '/api/v1/public/operations')).toHaveLength(2);
});

test('agenda e busca de horários permitem alternar as três visualizações', async ({ page }) => {
  await installFunctionalApi(page);

  await page.goto('/agenda/agenda.html');
  await expect(page.locator('[data-schedule-view="horizontal"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Agenda vertical' }).click();
  await expect(page.locator('[data-schedule-view="vertical"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Grade 360°' }).click();
  await expect(page.locator('[data-schedule-view="grid"]')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/novo-agendamento/novo-agendamento.html');
  await page.getByLabel('Pesquisa inteligente').fill('21/10/2030');
  await page.getByRole('button', { name: 'Pesquisar horários' }).click();
  await expect(page.locator('[data-slot-index="0"]')).toBeVisible();
  await page.getByRole('button', { name: 'Agenda vertical' }).click();
  await expect(page.locator('[data-schedule-view="vertical"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Grade 360°' }).click();
  await expect(page.locator('[data-schedule-view="grid"]')).toHaveAttribute('aria-pressed', 'true');
});

test('rotas internas exigem sessão e respeitam perfis autorizados', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['RECEPCAO'], username: 'e2e-recepcao' });
  await page.goto('/visao-geral/visao-geral.html');
  const forbiddenRoutes = [
    { roles: ['RECEPCAO'], path: `/prontuario/prontuario.html?patientId=${ids.patient}` },
    { roles: ['ADMIN'], path: `/prontuario/prontuario.html?patientId=${ids.patient}` },
    { roles: ['ADMIN'], path: '/exames/exames.html' },
    { roles: ['MEDICO'], path: '/usuarios/usuarios.html' },
    { roles: ['MEDICO'], path: '/especialidades/especialidades.html' },
    { roles: ['MEDICO'], path: '/novo-agendamento/novo-agendamento.html' }
  ];

  for (const item of forbiddenRoutes) {
    await page.evaluate(roles => {
      const session = JSON.parse(sessionStorage.getItem('clinicaHans.session'));
      sessionStorage.setItem('clinicaHans.session', JSON.stringify({ ...session, roles }));
    }, item.roles);
    await page.goto(item.path);
    await expect(page).toHaveURL(/\/visao-geral\/visao-geral\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  }

  await page.evaluate(() => sessionStorage.removeItem('clinicaHans.session'));
  await page.goto('/agenda/agenda.html');
  await expect(page).toHaveURL(/\/login\/login\.html$/);
});

test('sair encerra a sessão do navegador', async ({ page }) => {
  await installFunctionalApi(page, { roles: ['ADMIN'] });
  await page.goto('/visao-geral/visao-geral.html');
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login\/login\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Acessar sistema' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('clinicaHans.session'))).toBeNull();
});

test('login mostra resposta genérica para credencial inválida e aceita autenticação válida', async ({ page }) => {
  const calls = await installFunctionalApi(page, {
    session: false,
    override: call => {
      if (call.method !== 'POST' || call.pathname !== '/api/v1/auth/login') return undefined;
      if (call.body?.password === 'senha-correta-e2e') {
        return { status: 200, body: { accessToken: 'token-de-teste', roles: ['ADMIN'] } };
      }
      return { status: 401, body: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas.' } };
    }
  });

  await page.goto('/login/login.html');
  await page.getByLabel('Usuário').fill('usuario-ficticio');
  await page.getByLabel('Senha').fill('senha-incorreta');
  const deniedRequest = watchRequest(page, 'POST', '/api/v1/auth/login');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await deniedRequest;
  await expect(page.locator('#login-error')).toContainText('Sessão expirada ou credenciais inválidas.');

  await page.getByLabel('Senha').fill('senha-correta-e2e');
  const acceptedRequest = watchRequest(page, 'POST', '/api/v1/auth/login');
  await Promise.all([
    page.waitForURL(/\/visao-geral\/visao-geral\.html$/),
    page.getByRole('button', { name: 'Entrar' }).click()
  ]);
  await acceptedRequest;
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  expect(calls.filter(call => call.method === 'POST' && call.pathname === '/api/v1/auth/login')).toHaveLength(2);
});

test('listagem de pacientes mostra estado vazio sem erro', async ({ page }) => {
  await installFunctionalApi(page, {
    roles: ['RECEPCAO'],
    override: call => call.method === 'GET' && call.pathname === '/api/v1/patients'
      ? { body: [] }
      : undefined
  });
  await page.goto('/pacientes/pacientes.html');
  await expect(page.locator('#resultado')).toContainText(/nenhum|não há|sem /i);
  await expect(page.locator('#screen-root .state-card.error')).toHaveCount(0);
});

test('falha de listagem apresenta erro seguro na própria tela', async ({ page }) => {
  await installFunctionalApi(page, {
    roles: ['RECEPCAO'],
    override: call => call.method === 'GET' && call.pathname === '/api/v1/patients'
      ? { status: 503, body: { code: 'SERVICE_UNAVAILABLE', message: 'Falha temporária simulada.', correlationId: 'e2e-screen-error' } }
      : undefined
  });
  await page.goto('/pacientes/pacientes.html');
  await expect(page.locator('#screen-root .state-card.error')).toContainText('Falha temporária simulada.');
  await expect(page.locator('#screen-root')).toContainText('e2e-screen-error');
});

function watchRequest(page, method, pathname) {
  return page.waitForRequest(request => {
    const url = new URL(request.url());
    return request.method() === method && url.pathname === pathname;
  });
}

