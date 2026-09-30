---
agent: agent
description: Gera o frontend completo em HTML/CSS/JavaScript puro, alinhado aos protótipos e à API do backend.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 04 — Gerar Frontend Vanilla

## Leia antes de gerar
- `input/application-story.md`
- `docs/memory-bank/`
- `docs/specs/`
- `docs/diagrams/`
- `prototypes/`
- `backend/`
- `docs/architecture/frontend-standards.md`

## Objetivo
Gerar o frontend completo e coerente com os protótipos e com o backend, usando apenas HTML, CSS e JavaScript moderno puro.

## Stack obrigatória
- HTML5
- CSS3
- JavaScript ES2022+
- ES Modules
- Fetch API

## O que gerar
- login e controle de sessão;
- dashboard;
- telas e fluxos descritos nas especificações;
- componentes reutilizáveis;
- camada centralizada de acesso à API;
- estados de loading, erro, sucesso e vazio;
- rotas/navegação sem framework, de forma simples e previsível.

## Restrições
- Não usar React, Vue, Angular, TypeScript ou frameworks equivalentes.
- Não duplicar regras críticas do backend na interface.
- Não espalhar chamadas HTTP diretamente pelas views.

## Saída esperada
Atualizar `frontend/` com aplicação executável como site estático, integrada aos contratos REST do backend e visualmente coerente com `prototypes/`.
