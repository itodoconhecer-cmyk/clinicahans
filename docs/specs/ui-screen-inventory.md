# Inventário de Telas — Clínica Hans

Este arquivo é o checklist funcional do Prompt 04. O frontend só é considerado completo quando as capacidades do MVP possuem uma tela ou fluxo de interface explícito.

| ID | Tela / fluxo | Perfil | Situação |
|---|---|---|---|
| UI-001 | Login | Todos | PARCIAL |
| UI-010 | Visão geral | Todos | PARCIAL |
| UI-020 | Agenda médica | Todos internos | PARCIAL |
| UI-021 | Novo agendamento | Recepção/Admin | PARCIAL |
| UI-022 | Fila de espera | Recepção/Admin | PARCIAL |
| UI-023 | Converter fila em agendamento | Recepção/Admin | PARCIAL |
| UI-030 | Pacientes | Recepção/Médico/Admin | PARCIAL |
| UI-031 | Cadastro de paciente | Recepção/Admin | PARCIAL |
| UI-032 | Ficha administrativa do paciente | Recepção/Admin | PARCIAL |
| UI-033 | Editar paciente | Recepção/Admin | PARCIAL |
| UI-040 | Médicos | Todos internos | PARCIAL |
| UI-041 | Cadastro de médico | Gestão/Admin | PARCIAL |
| UI-042 | Detalhe do médico | Gestão/Admin | PARCIAL |
| UI-043 | Especialidades | Gestão/Admin | PARCIAL |
| UI-044 | Disponibilidade médica | Gestão/Admin | PARCIAL |
| UI-045 | Bloqueios de agenda | Gestão/Admin | PARCIAL |
| UI-046 | Vínculo usuário↔médico | Admin | PARCIAL |
| UI-050 | Prontuário integrado | Médico/Admin | PARCIAL |
| UI-051 | Safety snapshot | Médico/Admin | PARCIAL |
| UI-052 | Linha do tempo | Médico/Admin | PARCIAL |
| UI-053 | Alergias / alertas | Médico/Admin | PARCIAL |
| UI-054 | Medicamentos | Médico/Admin | PARCIAL |
| UI-055 | Condições clínicas | Médico/Admin | PARCIAL |
| UI-056 | Documentos clínicos | Médico/Admin | PARCIAL |
| UI-060 | Atendimento clínico | Médico/Admin | PARCIAL |
| UI-061 | Salvar rascunho | Médico/Admin | PARCIAL |
| UI-062 | Finalizar atendimento | Médico/Admin | PARCIAL |
| UI-063 | Adendo | Médico/Admin | PARCIAL |
| UI-064 | Solicitar exame | Médico/Admin | PARCIAL |
| UI-065 | Criar follow-up | Médico/Admin | PARCIAL |
| UI-070 | Exames pendentes | Médico/Admin | PARCIAL |
| UI-071 | Novo exame | Médico/Admin | PARCIAL |
| UI-072 | Receber resultado | Médico/Admin | PARCIAL |
| UI-073 | Revisar resultado | Médico/Admin | PARCIAL |
| UI-080 | Acompanhamentos/retornos | Recepção/Médico/Admin | PARCIAL |
| UI-081 | Novo acompanhamento | Médico/Admin | PARCIAL |
| UI-082 | Registrar ação | Recepção/Médico/Admin | PARCIAL |
| UI-090 | Faturamento | Recepção/Gestão/Admin | PARCIAL |
| UI-091 | Novo recebível | Recepção/Gestão/Admin | PARCIAL |
| UI-092 | Registrar pagamento | Recepção/Gestão/Admin | PARCIAL |
| UI-100 | Indicadores | Gestão/Admin | PARCIAL |
| UI-110 | Usuários | Admin | PARCIAL |
| UI-111 | Criar usuário | Admin | PARCIAL |
| UI-112 | Desativar usuário | Admin | PARCIAL |
| UI-120 | Auditoria | Admin | PARCIAL |
| UI-121 | Pesquisa auditoria | Admin | PARCIAL |
| UI-122 | Detalhe/correlationId | Admin | PARCIAL |

## Critérios para encerrar Prompt 04
- Prontuário e Atendimento devem ser telas distintas.
- Dashboard e Indicadores devem ser telas distintas.
- Exames e Follow-ups devem possuir criação e ações, não apenas listagem.
- Financeiro deve permitir lançamento e pagamento.
- Corpo clínico deve possuir UI para especialidades, disponibilidade e bloqueios.
- Waitlist deve permitir repescagem.
- Todas as telas devem respeitar roles e usar exclusivamente a camada `services/`.


## Revisão corretiva após feedback
A primeira execução do Prompt 04 integrou os fluxos principais, porém agrupou capacidades demais em poucas páginas. Após revisão, o frontend passou a possuir telas/rotas próprias para fila de espera, atendimento, exames, retornos, indicadores, especialidades, usuários e auditoria, além de fichas completas de paciente e médico e ações de configuração/financeiro.


## Reclassificação da revisão rigorosa — 06/10/2026
O status anterior "Implementada" indicava existência de código/rota, mas não havia teste E2E por tela. Pela nova régua do Prompt 04, todas as telas permanecem **PARCIAL** até existir evidência automatizada de fluxo ponta a ponta. O Frontend CI atual valida sintaxe/arquivos, não comportamento.
