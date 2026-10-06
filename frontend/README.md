# Frontend — Clínica Hans

Frontend oficial em **HTML5 + CSS3 + JavaScript ES2022+ puro**, usando ES Modules e Fetch API.

**Não usa e não deve usar React, Vue, Angular, Svelte, Vite, TypeScript, npm ou qualquer framework/bundler.** Não existe etapa de build: os arquivos são servidos diretamente ao navegador.

## Executar localmente

1. Inicie PostgreSQL e backend conforme `backend/README.md`.
2. Na raiz do repositório, sirva a pasta `frontend/`:

```bash
python -m http.server 5500 -d frontend
```

3. Acesse:

```text
http://localhost:5500
```

A API padrão é `http://localhost:8080`. Para alterar antes de carregar `app.js`, defina `window.CLN_API_BASE_URL` em uma página de hospedagem/customização ou ajuste `frontend/config.js`.

## CORS

O backend permite por padrão `http://localhost:5500`. Em outros ambientes, configure:

```bash
export CORS_ALLOWED_ORIGINS='https://app.exemplo.com'
```

Para mais de uma origem, separe por vírgula.

## Sessão

O JWT é armazenado em `sessionStorage` no MVP e removido no logout ou em resposta HTTP 401.

## Perfis

- RECEPCAO: pacientes, agenda, fila, continuidade operacional e financeiro.
- MEDICO: pacientes, agenda, prontuário, atendimento, exames e follow-ups.
- GESTAO: médicos, financeiro e indicadores.
- ADMIN: acesso amplo, usuários e auditoria.

A navegação é apenas UX; o backend continua sendo a autoridade de autorização.

## Regra de integração com o backend

Toda operação funcional consome a API Spring Boot real em `/api/v1/**`.
Somente `frontend/services/api.js` pode executar `fetch`. Views, componentes e roteamento chamam os clientes de domínio exportados por esse arquivo.

Não existem mocks como fonte de dados do sistema funcional. Loading, erro, vazio e sucesso são derivados das respostas reais do backend.

## Principais integrações

- `/api/v1/auth/login`
- `/api/v1/patients`
- `/api/v1/doctors`
- `/api/v1/appointments`
- `/api/v1/waitlist`
- `/api/v1/clinical`
- `/api/v1/continuity`
- `/api/v1/finance`
- `/api/v1/management`
- `/api/v1/admin/users`
- `/api/v1/audit`

## Limitações deliberadas do Prompt 04

- anexos usam `storageKey`; upload binário real exige storage/adaptador futuro;
- envio real de e-mail/WhatsApp depende de consumidor da notification outbox;
- portal do paciente, TISS/TUSS, prescrição digital e telemedicina completa permanecem evolução;
- a SPA não duplica regras críticas como conflito de agenda ou autorização clínica.

## CI
Alterações no frontend são validadas automaticamente pelo workflow Frontend CI.

## Cobertura de telas
A cobertura completa é controlada por `docs/specs/ui-screen-inventory.md`.

## Revisão rigorosa
A cobertura funcional permanece parcial até existirem testes E2E por perfil, conforme `docs/reviews/rigorous-review.md`.


## Gate arquitetural

O arquivo `frontend/verify-architecture.mjs` é executado no Frontend CI e falha quando:
- aparece React/Vite/TypeScript ou outro framework/bundler;
- surge `package.json`, JSX ou TSX;
- algum arquivo fora de `services/api.js` usa `fetch`;
- um dos grupos principais de endpoints do backend deixa de possuir cliente no frontend;
- `index.html` deixa de usar ES Modules nativos.
