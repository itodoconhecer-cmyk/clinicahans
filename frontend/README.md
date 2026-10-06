# Frontend — Clínica Hans

Frontend **multipágina** em HTML5, CSS3 e JavaScript ES2022+ puro.

## Regra estrutural

Cada tela possui sua própria pasta e, obrigatoriamente, três arquivos com o mesmo nome da pasta:

```text
frontend/
  agenda/
    agenda.html
    agenda.css
    agenda.js

  novo-agendamento/
    novo-agendamento.html
    novo-agendamento.css
    novo-agendamento.js

  pacientes/
    pacientes.html
    pacientes.css
    pacientes.js
```

Essa regra vale para **todas as telas e sub-telas funcionais**. Ações como cadastro, edição, receber resultado, registrar pagamento e criar usuário não ficam escondidas em um `app.js` central ou em uma SPA.

## Compartilhamento permitido

Somente infraestrutura comum fica fora das pastas de tela:

- `shared/global.css`: CSS geral;
- `shared/screen.js`: shell/navegação/sessão comum;
- `services/api.js`: único ponto de HTTP/fetch;
- `state/session.js`: sessão JWT;
- `components/`: componentes auxiliares comuns;
- `utils/`: formatação e helpers.

Cada tela continua possuindo seu próprio CSS, mesmo quando apenas importa o CSS geral.

## Stack fixa

- HTML5
- CSS3
- JavaScript ES2022+
- ES Modules
- Fetch API nativa, exclusivamente em `services/api.js`

Não usar React, Vue, Angular, Svelte, Vite, TypeScript, JSX/TSX ou etapa de build.

## Integração

Todas as telas funcionais consomem os endpoints REST reais do backend Spring Boot em `/api/v1/**` por meio dos clientes exportados por `frontend/services/api.js`.

Não existe mock como fonte funcional de dados.

## Executar

Inicie PostgreSQL e backend conforme `backend/README.md` e sirva os arquivos estáticos:

```bash
python -m http.server 5500 -d frontend
```

Acesse `http://localhost:5500`; o arquivo raiz redireciona para `login/login.html`.

A API padrão é `http://localhost:8080`. Para outro ambiente, ajuste `frontend/config.js` ou `window.CLN_API_BASE_URL`.

## CI

`frontend/verify-architecture.mjs` valida automaticamente:
- as 47 telas do inventário;
- pasta própria por tela;
- HTML, CSS e JS próprios por tela;
- referência do HTML aos seus arquivos CSS/JS;
- importação do CSS geral pelo CSS específico;
- ausência da antiga SPA `app.js`;
- ausência de frameworks/bundlers;
- ausência de `fetch` fora da camada de services;
- presença dos grupos principais de endpoints REST.

A cobertura funcional/E2E continua sendo tratada separadamente em `docs/specs/ui-screen-inventory.md`.
