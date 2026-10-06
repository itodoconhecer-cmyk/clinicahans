# Inventário de Telas — Clínica Hans

Este arquivo é o checklist funcional do Prompt 04. O frontend só é considerado completo quando as capacidades do MVP possuem uma tela ou fluxo de interface explícito.

| ID | Tela / fluxo | Perfil | Situação |
|---|---|---|---|
| UI-001 | Login | Todos | Implementada |
| UI-010 | Visão geral | Todos | Implementada |
| UI-020 | Agenda médica | Todos internos | Implementada |
| UI-021 | Novo agendamento | Recepção/Admin | Implementada |
| UI-022 | Fila de espera | Recepção/Admin | Implementar tela própria |
| UI-023 | Converter fila em agendamento | Recepção/Admin | Implementar |
| UI-030 | Pacientes | Recepção/Médico/Admin | Implementada |
| UI-031 | Cadastro de paciente | Recepção/Admin | Implementada |
| UI-032 | Ficha administrativa do paciente | Recepção/Admin | Implementar |
| UI-033 | Editar paciente | Recepção/Admin | Implementar |
| UI-040 | Médicos | Todos internos | Implementada |
| UI-041 | Cadastro de médico | Gestão/Admin | Implementada |
| UI-042 | Detalhe do médico | Gestão/Admin | Implementar |
| UI-043 | Especialidades | Gestão/Admin | Implementar tela própria |
| UI-044 | Disponibilidade médica | Gestão/Admin | Implementar |
| UI-045 | Bloqueios de agenda | Gestão/Admin | Implementar |
| UI-046 | Vínculo usuário↔médico | Admin | Implementar |
| UI-050 | Prontuário integrado | Médico/Admin | Implementada |
| UI-051 | Safety snapshot | Médico/Admin | Implementada |
| UI-052 | Linha do tempo | Médico/Admin | Implementada |
| UI-053 | Alergias / alertas | Médico/Admin | Implementar gestão completa |
| UI-054 | Medicamentos | Médico/Admin | Implementada parcialmente |
| UI-055 | Condições clínicas | Médico/Admin | Implementada parcialmente |
| UI-056 | Documentos clínicos | Médico/Admin | Implementar cadastro |
| UI-060 | Atendimento clínico | Médico/Admin | Implementar tela própria |
| UI-061 | Salvar rascunho | Médico/Admin | Implementada |
| UI-062 | Finalizar atendimento | Médico/Admin | Implementada |
| UI-063 | Adendo | Médico/Admin | Implementar |
| UI-064 | Solicitar exame | Médico/Admin | Implementar |
| UI-065 | Criar follow-up | Médico/Admin | Implementar |
| UI-070 | Exames pendentes | Médico/Admin | Implementada parcialmente |
| UI-071 | Novo exame | Médico/Admin | Implementar |
| UI-072 | Receber resultado | Médico/Admin | Implementar |
| UI-073 | Revisar resultado | Médico/Admin | Implementar |
| UI-080 | Acompanhamentos/retornos | Recepção/Médico/Admin | Implementada parcialmente |
| UI-081 | Novo acompanhamento | Médico/Admin | Implementar |
| UI-082 | Registrar ação | Recepção/Médico/Admin | Implementada |
| UI-090 | Faturamento | Recepção/Gestão/Admin | Implementada parcialmente |
| UI-091 | Novo recebível | Recepção/Gestão/Admin | Implementar |
| UI-092 | Registrar pagamento | Recepção/Gestão/Admin | Implementar |
| UI-100 | Indicadores | Gestão/Admin | Implementar tela própria |
| UI-110 | Usuários | Admin | Implementada parcialmente |
| UI-111 | Criar usuário | Admin | Implementada |
| UI-112 | Desativar usuário | Admin | Implementar |
| UI-120 | Auditoria | Admin | Implementada parcialmente |
| UI-121 | Pesquisa auditoria | Admin | Implementada |
| UI-122 | Detalhe/correlationId | Admin | Implementar melhor apresentação |

## Critérios para encerrar Prompt 04
- Prontuário e Atendimento devem ser telas distintas.
- Dashboard e Indicadores devem ser telas distintas.
- Exames e Follow-ups devem possuir criação e ações, não apenas listagem.
- Financeiro deve permitir lançamento e pagamento.
- Corpo clínico deve possuir UI para especialidades, disponibilidade e bloqueios.
- Waitlist deve permitir repescagem.
- Todas as telas devem respeitar roles e usar exclusivamente a camada `services/`.
