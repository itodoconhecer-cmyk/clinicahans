# Revisão do Prompt 04 — Frontend

## Escopo executado
- documentação funcional consolidada;
- catálogo de domínios;
- revisão dos diagramas;
- SPA Vanilla JS integrada à API real;
- sessão JWT em sessionStorage;
- navegação por roles;
- pacientes, médicos, agenda, waitlist, prontuário, atendimento, continuidade, financeiro e administração;
- CORS configurável no backend;
- CI de frontend e backend.

## Diagramas revisados
- `domain-model.mmd`: entidades atuais do banco, incluindo WaitlistEntry e NotificationOutbox;
- `main-flow.mmd`: máquinas de estado de Agenda, Encounter, Exame, Follow-up e Waitlist;
- `context-map.mmd`: dependências entre bounded contexts;
- `process.bpmn`: jornada com lanes Recepção, Médico, Continuidade e Gestão;
- `process.drawio`: visão executiva/operacional da jornada.

## Evidência de validação
- Frontend CI #2: success.
- Backend CI #27: success.
- PR técnico #2 incorporado.
- Merge de validação: `f764dc699a29d45f9820ec0325944845ff034744`.

## Limitações conhecidas
- frontend ainda não possui hospedagem contínua;
- upload binário real de documentos depende de storage;
- consumer da notification outbox ainda não foi implementado;
- TISS/TUSS, prescrição digital e portal do paciente permanecem evolução.

## Próxima revisão recomendada
Prompt 05 deve validar contratos frontend↔backend, segurança, observabilidade, dados iniciais, estratégia de deploy e testes ponta a ponta.
