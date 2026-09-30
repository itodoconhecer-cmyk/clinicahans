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
| Backend | Java 17+, Spring Boot, Spring Security + JWT, SQL explícito (sem JPA/Hibernate), OpenAPI/Swagger |
| Frontend | HTML5, CSS3, JavaScript moderno puro (ES Modules, Fetch API) |
| Banco de dados | PostgreSQL 15+ |
| Diagramas | Mermaid, draw.io, BPMN 2.0 (Camunda) |
| IA | GitHub Copilot Pro |

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
- Prompt 01 executado
- Protótipo funcional disponível em `prototypes/`
- Próxima etapa: Prompt 02 — especificações e fluxos
