# Paulo Jose — AI Factory

> **"A IA boa não começa no prompt. Ela começa no ambiente."**

Ambiente de engenharia assistida por IA para transformar uma história de negócio em uma aplicação moderna e completa — usando **GitHub Copilot**, memória explícita, agentes especializados e prompts de ação em sequência.

---

## O que é este projeto?

O **AI Factory** demonstra, na prática, que a qualidade do código gerado por IA depende diretamente da qualidade do ambiente preparado para ela.

Em vez de jogar um prompt solto e torcer pelo melhor resultado, este ambiente ensina a IA a trabalhar com:

- **História de negócio** como fonte primária
- **Memória explícita** do projeto (memory bank)
- **Regras e padrões** técnicos definidos previamente
- **Agentes especializados** para cada papel no processo
- **Prompts de ação sequenciais** que guiam a geração passo a passo

O resultado: uma aplicação full-stack coerente, rastreável e pronta para revisão técnica.

---

## Stack gerada

| Camada | Tecnologia |
|--------|-----------|
| Backend | Java 25 LTS, Spring Boot, Spring Security + JWT, SQL explícito (sem JPA/Hibernate), OpenAPI/Swagger |
| Frontend | HTML5, CSS3, JavaScript moderno puro (ES Modules, Fetch API) |
| Banco de dados | PostgreSQL 16 |
| Diagramas | Mermaid, draw.io, BPMN 2.0 (Camunda) |
| IA | GitHub Copilot Pro |

## Executar a Clínica Hans localmente

O ambiente completo roda com Docker Compose. No Windows, instale e inicie o Docker Desktop em modo Linux containers; para o painel de lâmpadas, tenha Python 3.10 ou superior instalado. Java, Maven e AWS CLI não precisam ser instalados no host: backend e serviços locais são executados em containers.

No PowerShell, na pasta do repositório:

```powershell
.\scripts\localstack.ps1 init
notepad .env.localstack
# Preencha LOCALSTACK_AUTH_TOKEN com seu próprio token LocalStack e salve.
.\scripts\localstack.ps1 start-all
.\scripts\localstack.ps1 verify
```

`init` cria `.env.localstack` com um segredo JWT e uma senha inicial aleatórios, sem sobrescrever arquivo existente. Consulte as credenciais do administrador nesse arquivo local. O token LocalStack é individual; não compartilhe nem versione `.env.localstack`. A estrutura e os valores de exemplo estão em `.env.localstack.example`. Sem token, a aplicação principal ainda pode ser executada com `start-app`, mas os recursos AWS emulados e o worker dependem do LocalStack.

Depois que os serviços estiverem saudáveis, acesse:

- Clínica Hans: [http://localhost:8090/login/login.html](http://localhost:8090/login/login.html)
- Mailpit para e-mails de teste: [http://localhost:8025](http://localhost:8025)
- Painel didático: em um segundo terminal PowerShell, execute `.\scripts\localstack.ps1 dashboard` e abra [http://localhost:8091](http://localhost:8091)

O painel mostra containers e atividade real de logs, sem exibir o conteúdo das mensagens. Encerre os serviços com `.\scripts\localstack.ps1 stop-all`; os volumes de dados são preservados. Os comandos, portas, recursos e limites estão detalhados em [infra/README.md](infra/README.md), e o [painel Docker](tools/docker-dashboard/README.md) tem seu próprio guia.

O diretório `infra/aws` contém Terraform para AWS real e é independente do LocalStack. Não execute `terraform apply` sem revisar o plano e os custos dos recursos.

---

## Estrutura do repositório

```
saint-paul-ia-factory/
│
├── input/
│   └── application-story.md        ← COLE A HISTÓRIA AQUI
│
├── .github/
│   ├── copilot-instructions.md     ← regras globais do Copilot
│   ├── agents/                     ← agentes especializados
│   ├── instructions/               ← padrões técnicos por camada
│   ├── prompts/                    ← prompts de ação (executar em ordem)
│   └── skills/
├── docs/
│   ├── memory-bank/                ← memória explícita do projeto
│   ├── specs/                      ← especificações geradas pelo Prompt 02
│   ├── architecture/               ← padrões e visão técnica
│   └── diagrams/                   ← diagramas gerados pelo Prompt 02
├── scripts/
├── prototypes/                     ← resultado do Prompt 01
└── docker-compose.yml
```

---

## Como usar

### 1. Suba o banco de dados

```bash
docker-compose up -d
```

### 2. História de negócio

A história vigente da Clínica Médica Dr. Hans Chucrute está em `input/application-story.md`.

### 3. Execute os prompts em sequência

#### Prompt 01 — Protótipos Funcionais

```
@workspace #file:.github/prompts/01-prototype.prompt.md
```

**Saída:** pasta `prototypes/` com telas navegáveis do sistema.

#### Prompt 02 — Especificação Técnica

```
@workspace #file:.github/prompts/02-specification.prompt.md
```

**Saída:** `docs/specs/` + diagramas em `docs/diagrams/`.

#### Prompt 03 — Backend Java

Gera Spring Boot seguindo a arquitetura consolidada, com SQL explícito e sem JPA/Hibernate.

#### Prompt 04 — Frontend Vanilla JS

Gera HTML/CSS/JavaScript puro alinhado ao protótipo e à API.

#### Prompt 05 — Revisão Técnica

Executa revisão integrada da solução.

---

## Fluxo completo

```
História de negócio
        │
        ▼
[Prompt 01] Protótipos HTML/CSS/JS
        │
        ▼
[Prompt 02] Especificações + Diagramas
        │
        ▼
[Prompt 03] Backend Java/Spring Boot
        │
        ▼
[Prompt 04] Frontend HTML/CSS/JavaScript
        │
        ▼
[Prompt 05] Revisão Técnica Integrada
```

---

## Estado atual

- IA Factory consolidada
- Arquitetura técnica unificada
- História da Clínica Dr. Hans Chucrute carregada
- Prompt 01 executado e protótipo funcional disponível em `prototypes/`
- Prompt 02 refeito em nível sênior com benchmark de mercado, especificações e diagramas
- Backend atualizado para Java 25 LTS + Spring Boot + JDBC/SQL explícito + PostgreSQL + JWT + OpenAPI
- Backend validado pelo GitHub Actions (Backend CI)
- Especificação funcional consolidada e catálogo de domínios publicados em `docs/specs/`
- Diagramas revisados: modelo de domínio, máquinas de estado, context map, BPMN e draw.io
- Prompt 04 executado: frontend Vanilla JS integrado à API real em `frontend/`
- Frontend e backend validados pelo GitHub Actions (Frontend CI + Backend CI)
- Próxima etapa: Prompt 05 — revisão técnica integrada e preparação de deploy
