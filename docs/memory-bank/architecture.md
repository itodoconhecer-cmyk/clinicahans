# Memory Bank — Arquitetura

## Visão arquitetural
A aplicação-alvo é pensada como uma solução web tradicional moderna:

- **Frontend oficial: HTML5 + CSS3 + JavaScript ES2022+ puro, usando ES Modules e Fetch API. React, Vue, Angular, Svelte, Vite, TypeScript e qualquer framework/bundler não fazem parte da arquitetura.**
- Backend em Java + Spring Boot + usar mesma arquitetura do git = https://github.com/itodoconhecer-cmyk/aulas_umc_2026_1_spring_boot
- Banco relacional PostgreSQL
- Autenticação baseada em JWT
- Evolução de banco de dados usando migration própria e sem frameworks, sem JPA, tudo com SQL raiz
- Documentação de API com Swagger/OpenAPI

## Princípios
- simplicidade primeiro;
- clareza antes de sofisticação;
- separação de responsabilidades;
- forte aderência ao domínio;
- documentação mínima útil;
- baixo improviso.


## Regra permanente do frontend
- O browser consome exclusivamente os endpoints REST versionados do backend em `/api/v1/**`.
- Toda chamada HTTP passa por `frontend/services/api.js`; views/componentes não usam `fetch` diretamente.
- Não manter mocks como fonte de dados da aplicação funcional.
- `frontend/index.html` deve carregar JavaScript nativo com `<script type="module">`.
- O frontend deve poder ser servido como arquivos estáticos, sem etapa de build.
