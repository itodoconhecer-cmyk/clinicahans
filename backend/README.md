# Backend — Clínica Hans

Backend gerado pelo Prompt 03 com foco em segurança clínica, rastreabilidade e SQL explícito.

## Stack
Java 25 LTS, Spring Boot 3.5.6, Spring Web/Security/JDBC, PostgreSQL 16, JWT, OpenAPI e migrations próprias. Não usa JPA/Hibernate.

## Avisos de exames

V013 adiciona `exam_notification_outbox`. Receber um resultado pela API cria, na mesma transação, intenções independentes para paciente e médico do atendimento. O worker é o mesmo monólito com `EXAM_NOTIFICATION_WORKER_ENABLED=true`; a API fica com esse modo desabilitado. O job SQS das 00h/12h libera intenções, e o publicador verifica arquivo no S3 antes de enfileirar UUIDs para envio. SMTP tem timeouts, não inclui dados clínicos/anexos e registra aceitação com auditoria. Não há backfill automático.

Localmente, use `scripts/localstack.ps1 start-all` e consulte Mailpit na porta 8025. Para parar só o consumidor, use `stop-notifications`. Envio externo exige `NOTIFICATION_EXTERNAL_ENABLED=true`, SMTP/STARTTLS e credenciais próprias; captura local é o padrão. Consulte [a especificação](../docs/specs/exam-ready-notifications.md) e [a alocação](../infra/README.md).

Testes SQL usam banco **isolado** com `CI_POSTGRES=true`, `DB_URL`, `DB_USER`, `DB_PASSWORD` e `JWT_SECRET`. O teste do fluxo completo também exige `NOTIFICATION_PIPELINE_TEST=true`, acesso a `http://localstack:4566` e `http://mailpit:8025` (substituíveis por `PIPELINE_LOCALSTACK_URL`/`PIPELINE_MAILPIT_URL`), credenciais AWS locais e SMTP Mailpit na porta 1025. Ele cria recursos temporários e destinatários sintéticos, limpa os registros/recursos do teste e mantém os dois e-mails capturados para inspeção. Sem essas flags, os testes de integração são ignorados. Nunca apontar essas configurações para banco ou SMTP de produção.

## Subir localmente
1. Suba o PostgreSQL da raiz: `docker compose up -d db`.
2. Exporte um segredo JWT com pelo menos 32 caracteres.
3. Para o primeiro acesso, informe `BOOTSTRAP_ADMIN_USERNAME` e `BOOTSTRAP_ADMIN_PASSWORD`.
4. Execute `mvn spring-boot:run` dentro de `backend/`.

Exemplo:
```bash
export JWT_SECRET='troque-por-um-segredo-forte-com-32-ou-mais-caracteres'
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='admin'
mvn spring-boot:run
```

Swagger: `/swagger-ui.html`.
Health: `/actuator/health`.
Consulta pública sanitizada de operações: `/api/v1/public/operations` ou
`frontend/logs-publicos/logs-publicos.html`. A trilha detalhada permanece disponível
somente para ADMIN em `/api/v1/audit`.

### Windows (PowerShell)

Requisitos: Java 25 LTS ou superior, Maven e Docker Desktop iniciado. Na raiz do repositório:

```powershell
# Use 5433 quando outro PostgreSQL já ocupar a porta 5432.
$env:POSTGRES_PORT = '5433'
docker compose up -d --wait db
$env:DB_URL = "jdbc:postgresql://localhost:$($env:POSTGRES_PORT)/clinicahans"
# Se definir POSTGRES_PASSWORD para um volume novo, use o mesmo valor em DB_PASSWORD.
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
$env:BOOTSTRAP_ADMIN_USERNAME = 'admin'
$password = Read-Host 'Senha inicial do administrador' -AsSecureString
$env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $password).Password
Set-Location backend
mvn spring-boot:run
```

Abra <http://localhost:8080/swagger-ui/index.html>. O contrato JSON está em
<http://localhost:8080/v3/api-docs> e a saúde em <http://localhost:8080/actuator/health>.
Para testar rotas protegidas, faça login em `POST /api/v1/auth/login` com `username`
e `password`, copie o token retornado e use **Authorize** no Swagger.

O bootstrap só cria o usuário quando ele ainda não existe; não redefine sua senha.
Guarde as credenciais fora do Git. O segredo JWT acima é temporário: ao gerar outro,
os tokens anteriores deixam de funcionar. Para parar, use `Ctrl+C` no backend e
`docker compose stop db` na raiz. O volume preserva os dados entre reinicializações.

Em outra máquina, faça `git clone`/`git pull` e repita a configuração local.
O Git transporta código e instruções; banco, credenciais e processos em execução
são locais. O endereço `localhost` é acessível apenas na própria máquina.

## Segurança
- Usuários são individuais e possuem roles.
- Médico autenticado deve estar vinculado ao cadastro de médico.
- Recepção não possui endpoints de prontuário.
- Leitura de prontuário gera auditoria.
- Atendimento finalizado não é editável pelo fluxo comum; correção usa adendo.
- Logs técnicos não devem receber texto clínico sensível.
- Arquivos técnicos JSON rotacionam diariamente em `logs/` (30 dias; `LOG_DIR` altera o destino).
- `WARN`/`ERROR` ficam ativos em todos os ambientes; `INFO` exige perfil `dev` ou `homolog`.
- A tela pública omite identidade, IP, identificadores e valores anteriores; conteúdo clínico anterior é redigido na trilha ADMIN.
- A trilha de auditoria no banco não expira automaticamente; a retenção formal deve ser definida antes da produção.
- SQL é parametrizado.

## Fluxo inicial
1. Bootstrap do primeiro ADMIN por variável de ambiente.
2. ADMIN cria usuários.
3. ADMIN/GESTÃO cadastra médico.
4. ADMIN vincula o usuário MEDICO ao cadastro do médico.
5. Recepção cadastra paciente e agenda.
6. Recepção confirma/check-in.
7. Médico abre safety snapshot e inicia atendimento.
8. Atendimento pode gerar exame e follow-up.
9. Atendimento finalizado pode gerar lançamento financeiro.

## Migrations
O runner próprio mantém `schema_migration` e executa os scripts em ordem. A inclusão de nova migration exige acrescentá-la à lista em `DatabaseMigrationRunner`.

## Organização de domínio
Os modelos de domínio são tipos de nível superior em arquivos próprios nos subpacotes de `model` (por exemplo, `patient`, `workforce`, `scheduling`, `clinical`, `continuity`, `billing` e `identity`). Objetos de valor compartilhados permanecem em `model/valueObjects`; projeções de consulta/apresentação não são agregados. `LoginResult` permanece como DTO em `DTO/`.

## Observação de produção
As metas de disponibilidade/RPO/RTO e integrações TISS/TUSS são requisitos planejados e precisam de validação operacional antes de produção real.

## Validação contínua
O workflow `Backend CI` compila o projeto com Java 25 e executa `mvn clean verify` em alterações do backend.

## Integração com frontend
O CORS é configurável por `CORS_ALLOWED_ORIGINS`; alterações em backend continuam protegidas pelo Backend CI.

## Contratos de apoio ao frontend
A revisão de telas adicionou listagem administrativa de usuários e consulta de resultado de exame por pedido.

## Revisão rigorosa
O backend é validado com PostgreSQL real no CI; pendências de produção estão em `docs/reviews/rigorous-review.md`.

## Dados de demonstracao

No perfil `dev`, cada inicializacao garante 10 medicos e 20 pacientes ficticios,
11 especialidades e 1.000 agendamentos identificados como demonstracao. Os
agendamentos ficam distribuidos por medico, paciente, modalidade e status, em
dias uteis passados e futuros. Ha tambem disponibilidade de Pneumologia aos
sabados para exercitar pesquisas por sinonimos. Cadastros existentes sao preservados e
reinicializacoes nao duplicam os dados. A carga roda apos as migrations, em
transacao. Nao cria logins para os medicos.
Use `CLINICAHANS_DEMO_DATA_ENABLED=false` para desativar ou `true` para habilitar
em outro perfil. Fora de `dev`, fica desativada por padrao.

Além da agenda de demonstração, a carga cria 60 consultas concluídas em cada
uma das oito semanas completas anteriores, com valores variados de forma
determinística para permitir a repetição sem duplicatas. Inclui três modalidades,
médicos de várias especialidades, recebíveis, pagamentos, pedidos de exames e
acompanhamentos fictícios. A identidade técnica desses registros está inativa e
sem permissão de acesso. As consultas
geradas têm a observação `DEMO-CONSULTATION-REPORTS - registro ficticio` no
agendamento. A carga completa é transacional e não deve ser habilitada em produção.

### Particionamento e inspeção

A migration V011 particiona por semana as tabelas `appointment` (início do
agendamento), `encounter` (início da consulta), `receivable` (criação), `payment`
(pagamento), `exam_result` (recebimento), `prescription` e `prescription_item`
(emissão). Os limites correspondem à segunda-feira em `America/Sao_Paulo`. Os
nomes seguem o padrão `<tabela>_wAAAAMMDD`. A aplicação cria as semanas futuras
na inicialização e diariamente às 02:15, com 26 semanas de antecedência; a criação
de agendamento também prepara a semana solicitada. Tabelas auxiliares `*_locator`
preservam a unicidade dos identificadores e as referências entre tabelas.

Para consultar as partições existentes no PostgreSQL:

```sql
SELECT parent.relname AS tabela, child.relname AS particao,
       pg_get_expr(child.relpartbound, child.oid) AS limites
FROM pg_inherits i
JOIN pg_class parent ON parent.oid = i.inhparent
JOIN pg_class child ON child.oid = i.inhrelid
WHERE parent.relname IN ('appointment', 'encounter', 'receivable', 'payment',
                         'exam_result', 'prescription', 'prescription_item')
ORDER BY tabela, particao;

SELECT tableoid::regclass AS particao, count(*) AS consultas
FROM encounter GROUP BY 1 ORDER BY 1;
```

Em uma instalação existente a V011 copia os dados em uma transação e requer
janela de manutenção e backup verificado. Prescrições já têm estrutura de
armazenamento, mas a emissão e a assinatura ainda não possuem fluxo na API.

Nesta máquina foi preparado um banco demonstrativo PostgreSQL 18 em
`.local/clinicahans-pgdata` (diretório ignorado pelo Git), com banco
`clinicahans_demo` na porta 55440. É isolado e usa autenticação local sem senha;
essa configuração serve somente para demonstração nesta máquina. Para apontar o
backend para ele no PowerShell, partindo da raiz do projeto:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
$env:DB_URL = 'jdbc:postgresql://127.0.0.1:55440/clinicahans_demo'
$env:DB_USER = 'postgres'
$env:DB_PASSWORD = ''
# Configure JWT_SECRET, BOOTSTRAP_ADMIN_USERNAME e BOOTSTRAP_ADMIN_PASSWORD.
Set-Location backend
mvn spring-boot:run
```

Se o servidor demonstrativo não estiver ativo, a partir da raiz é possível
iniciá-lo com o PostgreSQL 18 instalado neste caminho:

```powershell
$dadosDemonstracao = Join-Path (Get-Location).Path '.local\clinicahans-pgdata'
Start-Process -FilePath 'C:\Program Files\PostgreSQL\18\bin\postgres.exe' `
  -ArgumentList @('-D', ('"' + $dadosDemonstracao + '"'), '-p', '55440', '-h', '127.0.0.1') `
  -WindowStyle Hidden
```
