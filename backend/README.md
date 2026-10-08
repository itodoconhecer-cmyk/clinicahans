# Backend — Clínica Hans

Backend gerado pelo Prompt 03 com foco em segurança clínica, rastreabilidade e SQL explícito.

## Stack
Java 25 LTS, Spring Boot 3.5.6, Spring Web/Security/JDBC, PostgreSQL 16, JWT, OpenAPI e migrations próprias. Não usa JPA/Hibernate.

## Subir localmente
1. Suba o PostgreSQL da raiz: `docker compose up -d db`.
2. Exporte um segredo JWT com pelo menos 32 caracteres.
3. Para o primeiro acesso, informe `BOOTSTRAP_ADMIN_USERNAME` e `BOOTSTRAP_ADMIN_PASSWORD`.
4. Execute `mvn spring-boot:run` dentro de `backend/`.

Exemplo:
```bash
export JWT_SECRET='troque-por-um-segredo-forte-com-32-ou-mais-caracteres'
export BOOTSTRAP_ADMIN_USERNAME='admin'
export BOOTSTRAP_ADMIN_PASSWORD='troque-esta-senha'
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
