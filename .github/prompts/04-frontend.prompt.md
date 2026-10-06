---
agent: agent
description: Implementa frontend clínico multipágina em HTML/CSS/JavaScript puro, com uma pasta e três arquivos por tela.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 04 — Frontend Multipágina Vanilla

## Stack fixa
HTML5 + CSS3 + JavaScript ES2022+ ES Modules + Fetch API nativa.

**Proibido:** React, React DOM, Vue, Angular, Svelte, Vite, TypeScript, JSX/TSX, SPA centralizada, framework/bundler ou build obrigatório.

## Estrutura obrigatória — regra principal

**Cada item de tela/fluxo do `docs/specs/ui-screen-inventory.md` deve ser uma página física própria.**

Para uma tela chamada `novo-agendamento`:

```text
frontend/novo-agendamento/
  novo-agendamento.html
  novo-agendamento.css
  novo-agendamento.js
```

Os três arquivos são obrigatórios e pertencem somente àquela tela.

Não implementar uma nova tela como:
- modal dentro de outra tela;
- rota/hash de um `app.js` central;
- função gigantesca dentro de um JS compartilhado;
- seção escondida da mesma página.

## Compartilhamento permitido
Pode existir infraestrutura comum:
- `shared/global.css`;
- `shared/screen.js`;
- `services/api.js`;
- `state/session.js`;
- `components/`;
- `utils/`.

Mesmo usando CSS geral, **cada tela continua obrigada a possuir seu CSS próprio**.

## HTTP
Somente `services/api.js` executa `fetch`. O JS de cada tela importa o cliente de domínio e consome endpoints reais `/api/v1/**`.

## Navegação
Usar páginas HTML reais e links/redirects entre pastas. Não usar hash routing ou SPA.

## Cobertura
O inventário de telas é vinculante. Cadastro, detalhe, edição e ações operacionais são telas quando aparecem como tela/fluxo no inventário.

## Gate
O CI falha se:
- uma pasta de tela não tiver HTML/CSS/JS homônimos;
- o HTML não referenciar seu CSS e JS;
- surgir `frontend/app.js` como SPA;
- surgir framework/bundler;
- houver `fetch` fora de services;
- um grupo principal de endpoints do backend não tiver cliente frontend.

## Definition of Done
Uma tela só está estruturalmente pronta quando existe fisicamente como pasta própria com os três arquivos e usa os services para falar com o backend.
