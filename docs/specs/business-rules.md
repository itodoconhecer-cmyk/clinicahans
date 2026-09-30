# Regras de Negócio — Clínica Hans

## Paciente
- **RN-001:** paciente possui ID interno imutável.
- **RN-002:** CPF, quando informado, é único entre cadastros ativos; potencial duplicidade sem CPF deve ser sinalizada, não mesclada automaticamente.
- **RN-003:** merge de pacientes é operação administrativa especial e auditada; não faz parte do MVP inicial.

## Médico e agenda
- **RN-010:** CRM deve ser armazenado com UF; a combinação CRM+UF identifica registro profissional no contexto do sistema.
- **RN-011:** RQE é associado à qualificação/especialidade e não substitui CRM.
- **RN-012:** médico Inativo/Afastado não recebe novo agendamento em período indisponível.
- **RN-013:** duração do agendamento deve respeitar duração padrão ou exceção explicitada.
- **RN-014:** dois agendamentos ativos não podem sobrepor o mesmo médico.
- **RN-015:** bloqueio de agenda tem precedência sobre disponibilidade recorrente.
- **RN-016:** cancelamento libera capacidade quando não houver regra de bloqueio posterior.
- **RN-017:** ausência, cancelamento e remarcação são eventos históricos e não devem ser apagados.
- **RN-018:** check-in só é permitido para agendamento elegível no período configurado.
- **RN-019:** início do atendimento muda o estado da jornada, mas não apaga estado anterior de recepção.

## Prontuário e segurança do paciente
- **RN-020:** informação clínica pertence ao prontuário longitudinal do paciente.
- **RN-021:** alergia/reação crítica ativa deve aparecer no resumo antes de evolução/conduta.
- **RN-022:** alerta clínico precisa ter origem rastreável; alertas manuais possuem autor e motivo.
- **RN-023:** Recepção não acessa texto de evolução, diagnóstico, alergias detalhadas ou documentos clínicos, salvo exceção formalmente autorizada.
- **RN-024:** profissional autorizado pode visualizar histórico necessário mesmo que outro médico tenha produzido o registro.
- **RN-025:** conteúdo de atendimento em rascunho não equivale a registro final.
- **RN-026:** atendimento finalizado é imutável no fluxo comum.
- **RN-027:** correção posterior é feita por adendo/retificação, preservando registro original, autor, data e motivo.
- **RN-028:** exclusão física de conteúdo clínico não é operação de negócio padrão.

## Exames
- **RN-030:** solicitação deve apontar paciente e profissional solicitante; quando originada em consulta, aponta também o atendimento.
- **RN-031:** resultado deve apontar a solicitação original quando ela existir.
- **RN-032:** “resultado recebido” e “resultado revisado” são estados distintos.
- **RN-033:** pendência vencida é derivada de prazo + estado, não de edição manual de flag.
- **RN-034:** revisão clínica de resultado registra profissional e data/hora.

## Continuidade do cuidado
- **RN-040:** acompanhamento exige paciente, motivo, prioridade, responsável e estado.
- **RN-041:** acompanhamento baseado em prazo torna-se vencido automaticamente após dueAt quando aberto.
- **RN-042:** tentativa de contato não encerra acompanhamento automaticamente.
- **RN-043:** agendamento de retorno pode satisfazer um acompanhamento, mas o encerramento deve ser explícito ou por regra definida.
- **RN-044:** acompanhamento crítico vencido deve aparecer em fila prioritária.

## Financeiro
- **RN-050:** lançamento financeiro deriva de atendimento/procedimento identificável.
- **RN-051:** estorno/cancelamento financeiro preserva lançamento original e motivo.
- **RN-052:** status clínico e status financeiro são independentes.
- **RN-053:** Gestão pode ver valor/indicadores sem receber conteúdo clínico.
- **RN-054:** convênio/TISS/TUSS é extensão do financeiro/faturamento e não deve alterar sem necessidade o modelo central do prontuário.

## Auditoria e acesso
- **RN-060:** toda leitura relevante de prontuário deve registrar usuário, paciente, ação, horário e contexto técnico mínimo.
- **RN-061:** alterações de permissão, status de usuário, alerta crítico, alergia e atendimento finalizado são ações auditáveis.
- **RN-062:** evento de auditoria não é editável por usuários funcionais.
- **RN-063:** usuário desativado perde capacidade de autenticação, sem apagar autoria histórica.
- **RN-064:** toda decisão de autorização é feita no backend; ocultar botão na interface não constitui segurança.

## Indicadores
- **RN-070:** taxa de ausência usa denominador documentado e estados fechados do agendamento.
- **RN-071:** ocupação considera capacidade configurada menos bloqueios e horários não ofertáveis.
- **RN-072:** novo paciente é definido pela primeira ocorrência elegível, com regra explicitada no relatório.
- **RN-073:** indicador deve guardar definição/versão quando a regra puder mudar.

## Regras de arquitetura de domínio
- **RN-080:** estados de entidades críticas são enums controlados no backend e constraints no banco quando adequado.
- **RN-081:** transições inválidas devem ser rejeitadas pelo serviço de domínio, não apenas pela UI.
- **RN-082:** datas de criação, autoria e versão são geradas/garantidas no backend.
