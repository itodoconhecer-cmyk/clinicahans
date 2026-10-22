# Testes de agendamento

## Cobertura automatizada

Os testes usam a tela `frontend/novo-agendamento/novo-agendamento.html`, a API Spring Boot e um PostgreSQL dedicado. O cenário de sucesso confirma o retorno HTTP e consulta diretamente `appointment`, `appointment_status_history`, `notification_outbox` e `audit_event`. Um cenário reserva o mesmo intervalo entre a busca e o envio para validar a resposta de conflito na própria tela.

A suíte também cobre bloqueio de agenda, médico inativo, pesquisa de data passada, erro temporário simulado no navegador e nova tentativa contra o backend real. As pré-condições são sintéticas e são removidas ao final de cada teste.

Os testes unitários Java de `AppointmentUseCase` cobrem datas passadas, médico inativo, limites de duração, disponibilidade, alinhamento de slot, bloqueio, sobreposição, criação/auditoria, transições, motivo obrigatório de cancelamento, estados finais, acesso por médico e filtros de agenda.

## Preparação local no Windows

Requisitos: Docker Desktop, Java 25 (ou a versão definida pelo projeto), Maven, Node.js e Python.

```powershell
$env:POSTGRES_PORT = '5433'
docker compose up -d --wait db
.\scripts\prepare-playwright.ps1
npm install
npx playwright install chromium
$env:E2E_DATABASE_URL = 'postgres://postgres:postgres@localhost:5433/clinicahans_e2e'
$env:E2E_ADMIN_PASSWORD = 'senha-local-temporaria'
$env:E2E_JAVA_VERSION = '24' # somente se a JVM local for 24; CI usa Java 25
npm run test:e2e
```

Use a porta publicada pelo Docker Compose no seu ambiente; o exemplo acima usa `5433`, que evita conflito com outro PostgreSQL local.

O Playwright inicia o backend em `127.0.0.1:8081` e serve o frontend em `127.0.0.1:5501`. O primeiro início cria migrations e uma conta ADMIN isolada nesse banco. O bootstrap não troca a senha de uma conta já existente; mantenha a senha usada no primeiro início ou use um banco E2E novo.

Os testes exigem que `E2E_DATABASE_URL` tenha um nome contendo `e2e` ou `test`. Eles não iniciam testes contra o banco padrão da clínica. O script de preparação cria apenas `clinicahans_e2e` e não apaga bancos ou volumes.

Para executar os testes unitários do backend:

```powershell
mvn "-Djava.version=24" -f backend/pom.xml test
```

O override deve corresponder à JVM instalada. No CI e no ambiente padrão do projeto, mantenha Java 25.

## Evidências da execução

Cada teste grava vídeo WebM em 1920×1080, capturas PNG por etapa e um `rede-trilha.json` com URLs, método, payload filtrado, status, `X-Correlation-Id` e duração em milissegundos. A trilha identifica também as verificações feitas diretamente no banco. Senhas, tokens, nomes de pacientes e médicos, CPF, contato, nascimento e observações são removidos dos registros de rede.

Os arquivos ficam em `artifacts/playwright/`; essa pasta é ignorada pelo Git por poder conter imagens e dados operacionais de teste. Abra o relatório com:

```powershell
npm run report:e2e
```

O Playwright Trace Viewer fica desativado porque o trace nativo pode incluir tokens e cabeçalhos completos. A gravação de rede é feita pela trilha filtrada acima.

## Roteiro operacional manual

Use apenas pacientes fictícios e o banco E2E. Prepare um médico com agenda futura, um paciente sintético e uma conta com perfil RECEPCAO. Execute as ações de operação na tela de novo agendamento; use os endpoints de configuração somente para preparar as condições do caso.

| ID | Cenário e passos | Resultado esperado |
|---|---|---|
| OAT-AG-01 | Entre como RECEPCAO, abra **Novo agendamento**, pesquise uma data futura com slots livres e alterne lista horizontal, agenda vertical e Grade 360°. | Horários disponíveis e dados do médico aparecem; nenhum token ou dado clínico aparece. |
| OAT-AG-02 | Selecione um slot, pesquise o paciente, escolha modalidade e confirme. | A tela mostra sucesso; o backend retorna HTTP 200; o banco contém estado `SCHEDULED`, histórico inicial, evento de auditoria e item de confirmação na outbox. |
| OAT-AG-03 | Abra duas sessões de recepção, busque o mesmo slot em ambas e confirme primeiro em uma, depois na outra. | A primeira reserva é persistida; a segunda recebe HTTP 409, mostra erro compreensível e não cria outra reserva. |
| OAT-AG-04 | Prepare bloqueio parcial que cubra o slot e pesquise novamente a data. | O horário bloqueado não aparece como disponível, mesmo havendo disponibilidade semanal. |
| OAT-AG-05 | Prepare médico INACTIVE com disponibilidade cadastrada e pesquise a data. | A busca não oferece slots para esse médico. Um POST direto de agendamento também deve retornar conflito se a regra for exercitada pela API. |
| OAT-AG-06 | Pesquise um dia passado, fora da faixa semanal, ou horário fora do intervalo cadastrado. | Nenhum slot reservável é mostrado; a tentativa direta de criação é recusada pelo backend. |
| OAT-AG-07 | Interrompa o backend ou simule HTTP 503 no POST da reserva e repita após restaurar o serviço. | A mensagem de falha fica visível, os dados do formulário permanecem e uma nova tentativa envia a requisição ao backend. |
| OAT-AG-08 | Use perfil sem `RECEPCAO`/`ADMIN` para abrir a tela ou enviar criação. | A navegação não libera a operação e o backend responde 403 para uma chamada sem permissão. |
| OAT-AG-09 | Após agendar, consulte o mesmo ID pela API e a linha em `appointment`; confira `appointment_status_history`, `audit_event` e `notification_outbox`. | Todos os registros pertencem ao mesmo agendamento; a confirmação permanece assíncrona e não desfaz a reserva. |
| OAT-AG-10 | Exercite `CONFIRMED`, `CHECKED_IN`, `IN_CARE`, `COMPLETED`, `CANCELLED` com motivo e `NO_SHOW` em agendamentos de teste; tente também uma transição inválida. | Somente transições válidas mudam status; cancelamento exige motivo; cada mudança deixa histórico e auditoria. |

### Consultas de conferência do banco

Substitua o UUID por um ID retornado pela tela:

```sql
select id, patient_id, doctor_id, starts_at, ends_at, status
from appointment where id = '<uuid>';

select from_status, to_status, changed_at, reason
from appointment_status_history where appointment_id = '<uuid>' order by changed_at;

select action, entity_type, entity_id, correlation_id, occurred_at
from audit_event where entity_type = 'APPOINTMENT' and entity_id = '<uuid>' order by occurred_at;

select template_code, status, created_at
from notification_outbox where aggregate_id = '<uuid>';
```

Na tela atual, criação e pesquisa de horário são fluxos visuais; transições de status são cobertas por testes unitários e pela API porque a agenda ainda não oferece controles visuais para confirmar, cancelar ou fazer check-in.
