---
agent: agent
description: Gera frontend funcional de nível sênior em HTML/CSS/JavaScript puro, integrado à API real da Clínica Hans.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 04 — Frontend Funcional da Clínica Hans

## Fontes obrigatórias
1. `input/application-story.md`
2. `docs/specs/functional-specification.md`
3. `docs/specs/domains.md`
4. `docs/specs/functional-requirements.md`
5. `docs/specs/business-rules.md`
6. `docs/diagrams/`
7. `prototypes/`
8. `backend/`

## Objetivo
Transformar o protótipo em uma SPA leve, sem framework, integrada aos endpoints REST reais do backend e respeitando perfis, estados e regras de domínio.

## Stack obrigatória
- HTML5
- CSS3
- JavaScript ES2022+
- ES Modules
- Fetch API
- zero frameworks de UI
- zero TypeScript

## Arquitetura frontend
- `services/`: cliente HTTP centralizado e APIs por domínio;
- `state/`: sessão e estado global mínimo;
- `views/`: telas orientadas a tarefas;
- `components/`: UI reutilizável;
- `utils/`: formatação e helpers;
- hash routing simples;
- configuração de API centralizada.

## Perfis
A navegação deve derivar das roles retornadas no login:
- RECEPCAO: pacientes, agenda, fila de espera, continuidade operacional, financeiro;
- MEDICO: pacientes, agenda, prontuário, atendimento, exames/follow-ups;
- GESTAO: médicos, financeiro, indicadores;
- ADMIN: acesso amplo, usuários e auditoria.

A UI pode ocultar capacidades, mas autorização continua sendo responsabilidade do backend.

## UX obrigatória
- login real;
- sessão JWT;
- loading;
- erro com mensagem do backend;
- estado vazio;
- feedback de sucesso;
- logout;
- telas responsivas;
- foco e labels;
- identidade visual Clínica Hans e paleta vigente.

## Fluxos prioritários
1. Login.
2. Pesquisar/cadastrar paciente.
3. Pesquisar/cadastrar médico e visualizar disponibilidade.
4. Listar/criar agenda e executar transições válidas.
5. Fila de espera e conversão em agendamento.
6. Abrir safety snapshot e timeline.
7. Iniciar atendimento, salvar rascunho e finalizar.
8. Registrar alergia, medicamento, condição e documento.
9. Exames pendentes, recebimento e revisão.
10. Follow-ups operacionais.
11. Financeiro.
12. Indicadores.
13. Admin: usuários e auditoria.

## Integração
- nenhuma view deve usar `fetch` diretamente;
- respostas 401 encerram sessão;
- 403 devem ser apresentadas como acesso negado;
- correlationId deve ser mostrado em erros quando fornecido;
- API base configurável, default `http://localhost:8080`;
- frontend local previsto em `http://localhost:5500`.

## Segurança
- token somente em sessionStorage no MVP;
- não registrar token ou conteúdo clínico em console;
- evitar innerHTML com dados externos sem escape;
- jamais confiar em role apenas da interface.

## Definition of Done
- frontend abre como site estático;
- login chama backend real;
- navegação reflete roles;
- principais APIs estão integradas;
- nenhuma chamada HTTP espalhada fora da camada de serviços;
- estados de UI tratados;
- backend CORS permite apenas origens configuradas;
- documentação de execução disponível;
- validação sintática/CI do frontend configurada.
