---
agent: agent
description: Implementa frontend clínico task-oriented, completo por tela, sem IDs técnicos como UX e com testes de fluxo.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 04 — Frontend Completo e Verificável

## Fontes
- história;
- `docs/specs/functional-specification.md`;
- `docs/specs/traceability-matrix.md`;
- `docs/specs/ui-screen-inventory.md`;
- domínios/regras;
- diagramas;
- protótipos;
- OpenAPI/backend real.

## Stack
HTML5 + CSS3 + JavaScript ES2022+ ES Modules; zero framework; zero TypeScript.

## Estrutura obrigatória
- `services/`: HTTP;
- `state/`: sessão/estado mínimo;
- `views/`: **uma view por tarefa/tela principal**;
- `components/`: reutilizáveis;
- `utils/`;
- `app.js` apenas bootstrap/roteamento, sem virar monólito de todas as telas.

## Regra de cobertura
`ui-screen-inventory.md` é checklist vinculante.
Uma tela só recebe `IMPLEMENTADO_E_VERIFICADO` se:
1. possui rota/view real;
2. ações principais funcionam;
3. usa API real via services;
4. trata loading/vazio/erro/sucesso;
5. respeita role;
6. possui teste de fluxo;
7. não exige que usuário comum digite/copiei UUID técnico para operar.

## UX clínica
- nomes e contexto humano, não UUIDs como coluna principal;
- seleção de paciente/médico/agendamento por busca;
- prontuário e atendimento separados;
- alerta crítico visível antes de ação clínica;
- estados e transições com linguagem compreensível;
- confirmação em ações destrutivas;
- formulários preservam dados em erro;
- acessibilidade: foco, teclado, modal com role/focus trap/ESC, labels, contraste e mensagens associadas.

## Segurança
- nenhuma autorização confiada à UI;
- dados do DOM externos sempre escapados ou renderizados por APIs seguras;
- token não logado;
- estratégia de sessão alinhada ao backend;
- CSP e headers de produção documentados;
- 401 encerra sessão; 403 preserva sessão e informa negação.

## Testes
- validação sintática não é suficiente;
- testes unitários para helpers/roteamento;
- smoke/E2E dos fluxos por perfil: login, agenda, paciente, prontuário, atendimento, exame, follow-up, financeiro, admin;
- teste que garante que tela MEDICO não oferece/obtém dados fora do escopo;
- CI deve executar os testes, não apenas `node --check`.

## Definition of Done
Nenhuma tela pode ser marcada completa apenas por existir HTML/botão. O inventário deve apontar evidência objetiva (arquivo, endpoint e teste).
