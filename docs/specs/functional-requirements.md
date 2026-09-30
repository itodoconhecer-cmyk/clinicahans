# Requisitos Funcionais — Clínica Hans

## Escopo
Estes requisitos derivam da história de negócio da Clínica Hans e do protótipo funcional vigente.

### Cadastro e acesso
- **RF-001 — Autenticar usuário:** permitir login de usuários autorizados.
- **RF-002 — Controlar perfis e permissões:** diferenciar ao menos Médico, Recepção e Gestão.
- **RF-003 — Cadastrar paciente:** manter dados pessoais, contato e dados administrativos.
- **RF-004 — Atualizar cadastro do paciente:** permitir manutenção dos dados com rastreabilidade.
- **RF-005 — Cadastrar médico:** registrar nome, CPF, nascimento, CRM/UF, RQE, especialidade, subespecialidade, contatos, endereço, duração padrão de consulta, sala, disponibilidade, modalidade, status e observações administrativas.
- **RF-006 — Consultar médicos:** pesquisar por nome, CRM, RQE, especialidade e e-mail.
- **RF-007 — Alterar status do médico:** controlar ativo, inativo e afastado/férias.

### Agenda
- **RF-008 — Gerenciar agenda médica:** criar, consultar, alterar e cancelar horários.
- **RF-009 — Agendar consulta:** relacionar paciente, médico, especialidade, data/hora e observação.
- **RF-010 — Confirmar consulta:** registrar confirmação do paciente.
- **RF-011 — Registrar cancelamento e ausência:** manter motivo/status para indicadores.
- **RF-012 — Permitir encaixe:** ocupar horários liberados conforme disponibilidade.
- **RF-013 — Emitir lembretes:** gerar notificações de consulta e retorno.

### Atendimento e prontuário
- **RF-014 — Abrir prontuário integrado:** exibir visão consolidada do histórico do paciente.
- **RF-015 — Registrar atendimento:** armazenar queixa, história/avaliação, conduta e evolução.
- **RF-016 — Manter linha do tempo clínica:** ordenar consultas, exames, resultados, alergias e eventos relevantes.
- **RF-017 — Registrar alergias e reações medicamentosas:** destacar informação crítica.
- **RF-018 — Registrar medicamentos em uso:** manter lista atual e histórico.
- **RF-019 — Registrar condições clínicas relevantes:** tornar informação disponível a profissionais autorizados.
- **RF-020 — Alertar risco clínico:** exibir alerta antes e durante atendimento quando houver alergia/reação ou outra informação crítica.
- **RF-021 — Salvar atendimento como rascunho:** permitir continuidade antes da finalização.
- **RF-022 — Finalizar atendimento:** fechar registro clínico com autoria, data e hora.

### Exames e continuidade do cuidado
- **RF-023 — Solicitar exame:** associar solicitação ao atendimento e paciente.
- **RF-024 — Acompanhar exame:** controlar estados solicitado, realizado, resultado recebido, revisado e atrasado.
- **RF-025 — Anexar resultado de exame:** relacionar resultado ao paciente e à solicitação correspondente.
- **RF-026 — Registrar necessidade de retorno:** definir prazo ou condição para retorno.
- **RF-027 — Acompanhar retornos pendentes:** disponibilizar fila de pacientes que exigem ação.
- **RF-028 — Registrar ação de acompanhamento:** armazenar contato, tentativa e resolução.

### Financeiro e gestão
- **RF-029 — Registrar faturamento:** associar atendimento, forma de pagamento/convênio, valor e status.
- **RF-030 — Consultar lançamentos financeiros:** exibir registros recentes e pendências.
- **RF-031 — Exibir indicadores operacionais:** novos pacientes, faltas, cancelamentos, tempo até consulta, ocupação por especialidade e acompanhamentos pendentes.
- **RF-032 — Exibir painel de visão geral:** apresentar consultas do dia, pendências e alertas prioritários.

### Auditoria e segurança
- **RF-033 — Registrar trilha de auditoria:** registrar usuário, ação, entidade, data/hora e contexto de alteração/acesso relevante.
- **RF-034 — Restringir acesso clínico:** impedir que perfis administrativos visualizem conteúdo clínico não necessário.
- **RF-035 — Registrar consentimentos e bases legais quando aplicável:** permitir rastreabilidade de tratamento de dados pessoais.
- **RF-036 — Consultar histórico de alterações:** disponibilizar auditoria para perfis autorizados.

## Rastreabilidade resumida
- Jornada clínica: RF-014 a RF-028.
- Operação da recepção: RF-008 a RF-013.
- Corpo clínico: RF-005 a RF-007.
- Gestão: RF-029 a RF-032.
- Segurança e privacidade: RF-001, RF-002, RF-033 a RF-036.
