# Inventário de Telas — Clínica Hans

Este arquivo é o checklist funcional do Prompt 04. O frontend só é considerado completo quando as capacidades do MVP possuem uma tela ou fluxo de interface explícito.

| ID | Tela / fluxo | Perfil | Situação |
|---|---|---|---|
| UI-001 | Login | Todos | Implementada |
| UI-010 | Visão geral | Todos | Implementada |
| UI-020 | Agenda médica | Todos internos | Implementada |
| UI-021 | Novo agendamento | Recepção/Admin | Implementada |
| UI-022 | Fila de espera | Recepção/Admin | Implementada |
| UI-023 | Converter fila em agendamento | Recepção/Admin | Implementada |
| UI-030 | Pacientes | Recepção/Médico/Admin | Implementada |
| UI-031 | Cadastro de paciente | Recepção/Admin | Implementada |
| UI-032 | Ficha administrativa do paciente | Recepção/Admin | Implementada |
| UI-033 | Editar paciente | Recepção/Admin | Implementada |
| UI-040 | Médicos | Todos internos | Implementada |
| UI-041 | Cadastro de médico | Gestão/Admin | Implementada |
| UI-042 | Detalhe do médico | Gestão/Admin | Implementada |
| UI-043 | Especialidades | Gestão/Admin | Implementada |
| UI-044 | Disponibilidade médica | Gestão/Admin | Implementada |
| UI-045 | Bloqueios de agenda | Gestão/Admin | Implementada |
| UI-046 | Vínculo usuário↔médico | Admin | Implementada |
| UI-050 | Prontuário integrado | Médico/Admin | Implementada |
| UI-051 | Safety snapshot | Médico/Admin | Implementada |
| UI-052 | Linha do tempo | Médico/Admin | Implementada |
| UI-053 | Alergias / alertas | Médico/Admin | Implementada |
| UI-054 | Medicamentos | Médico/Admin | Implementada |
| UI-055 | Condições clínicas | Médico/Admin | Implementada |
| UI-056 | Documentos clínicos | Médico/Admin | Implementada cadastro |
| UI-060 | Atendimento clínico | Médico/Admin | Implementada |
| UI-061 | Salvar rascunho | Médico/Admin | Implementada |
| UI-062 | Finalizar atendimento | Médico/Admin | Implementada |
| UI-063 | Adendo | Médico/Admin | Implementada |
| UI-064 | Solicitar exame | Médico/Admin | Implementada |
| UI-065 | Criar follow-up | Médico/Admin | Implementada |
| UI-070 | Exames pendentes | Médico/Admin | Implementada |
| UI-071 | Novo exame | Médico/Admin | Implementada |
| UI-072 | Receber resultado | Médico/Admin | Implementada |
| UI-073 | Revisar resultado | Médico/Admin | Implementada |
| UI-080 | Acompanhamentos/retornos | Recepção/Médico/Admin | Implementada |
| UI-081 | Novo acompanhamento | Médico/Admin | Implementada |
| UI-082 | Registrar ação | Recepção/Médico/Admin | Implementada |
| UI-090 | Faturamento | Recepção/Gestão/Admin | Implementada |
| UI-091 | Novo recebível | Recepção/Gestão/Admin | Implementada |
| UI-092 | Registrar pagamento | Recepção/Gestão/Admin | Implementada |
| UI-100 | Indicadores | Gestão/Admin | Implementada |
| UI-110 | Usuários | Admin | Implementada |
| UI-111 | Criar usuário | Admin | Implementada |
| UI-112 | Desativar usuário | Admin | Implementada |
| UI-120 | Auditoria | Admin | Implementada |
| UI-121 | Pesquisa auditoria | Admin | Implementada |
| UI-122 | Detalhe/correlationId | Admin | Implementada |

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
