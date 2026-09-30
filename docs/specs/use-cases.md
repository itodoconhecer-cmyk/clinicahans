# Casos de Uso — Clínica Hans

## Atores
- Paciente
- Recepcionista
- Médico
- Gestor
- Serviço de Notificação
- Administrador do Sistema

## Casos de uso
### UC-001 — Autenticar usuário
**Atores:** todos os usuários internos.  
**Fluxo:** informar credenciais → validar → carregar perfil/permissões → iniciar sessão.

### UC-002 — Cadastrar paciente
**Ator principal:** Recepcionista.  
**Fluxo:** informar dados → validar duplicidade → salvar → registrar auditoria.

### UC-003 — Cadastrar médico
**Ator principal:** Gestão/Administrador.  
**Fluxo:** informar dados pessoais e profissionais → validar CRM/UF e campos obrigatórios → configurar especialidade, agenda e status → salvar → auditar.

### UC-004 — Consultar corpo clínico
**Atores:** Recepção, Gestão.  
**Fluxo:** pesquisar por nome/CRM/RQE/especialidade → listar → abrir cadastro conforme permissão.

### UC-005 — Criar agendamento
**Ator principal:** Recepcionista.  
**Fluxo:** selecionar paciente → médico → horário disponível → validar conflito → salvar → opcionalmente notificar paciente.

### UC-006 — Confirmar/cancelar consulta
**Atores:** Recepção, Paciente via canal integrado.  
**Fluxo:** localizar agendamento → registrar confirmação/cancelamento → atualizar disponibilidade → auditar evento.

### UC-007 — Consultar prontuário
**Ator principal:** Médico.  
**Pré-condição:** autorização para acesso.  
**Fluxo:** localizar paciente → exibir resumo, alertas e linha do tempo → registrar acesso em auditoria.

### UC-008 — Realizar atendimento
**Ator principal:** Médico.  
**Fluxo:** abrir prontuário → revisar alertas → registrar queixa/avaliação/conduta → solicitar exames/retorno → finalizar atendimento.

### UC-009 — Registrar alergia ou reação
**Ator principal:** Médico.  
**Fluxo:** informar substância, reação e criticidade → salvar → disponibilizar alerta para atendimentos futuros.

### UC-010 — Solicitar e acompanhar exame
**Ator principal:** Médico/Equipe autorizada.  
**Fluxo:** criar solicitação → acompanhar realização → anexar resultado → marcar revisão → encerrar pendência.

### UC-011 — Acompanhar retorno
**Atores:** Médico, Recepção.  
**Fluxo:** registrar necessidade/prazo → incluir em fila → realizar contato/agendamento → concluir acompanhamento.

### UC-012 — Registrar faturamento
**Ator principal:** Recepção/Financeiro.  
**Fluxo:** selecionar atendimento → forma de pagamento/convênio → valor/status → salvar.

### UC-013 — Consultar indicadores
**Ator principal:** Gestor.  
**Fluxo:** selecionar período/filtro → calcular métricas → apresentar visão consolidada.

### UC-014 — Auditar acesso e alteração
**Ator principal:** Administrador/Auditor autorizado.  
**Fluxo:** selecionar entidade/período/usuário → consultar eventos → analisar origem, data/hora e ação.

## Exceções relevantes
- Conflito de agenda bloqueia criação do agendamento.
- Usuário sem permissão recebe acesso negado sem exposição do dado.
- Alerta clínico crítico deve ser apresentado independentemente do médico que criou o registro.
- Falha no envio de notificação não deve apagar ou cancelar o agendamento.
