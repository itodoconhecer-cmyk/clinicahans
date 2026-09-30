# Requisitos Funcionais — Clínica Hans

## 1. Objetivo e escopo
Transformar a Clínica Hans de registros fragmentados para uma plataforma centrada na jornada longitudinal do paciente, cobrindo recepção, agenda, atendimento, prontuário, continuidade do cuidado, financeiro básico e gestão.

**Criticidade:** P0 = segurança/operação essencial; P1 = necessário para MVP; P2 = evolução planejada.

## 2. Identidade, acesso e equipe
- **RF-001 [P0] Autenticar usuário** por credencial individual.
  - Aceite: usuário inativo não autentica; falha não revela existência da conta.
- **RF-002 [P0] Autorizar por perfil/permissão** (Médico, Recepção, Gestão, Administrador).
  - Aceite: endpoint clínico retorna acesso negado para Recepção.
- **RF-003 [P0] Cadastrar médico** com nome, CPF, CRM, UF, RQE opcional, especialidade principal, subespecialidades, contato, status e parâmetros de agenda.
  - Aceite: CRM+UF não pode duplicar médico ativo; status controla possibilidade de novos agendamentos.
- **RF-004 [P1] Gerenciar disponibilidade médica** por dia da semana, faixas, duração padrão e bloqueios.
- **RF-005 [P1] Pesquisar corpo clínico** por nome, CRM/UF, RQE, especialidade e status.

## 3. Paciente
- **RF-010 [P0] Cadastrar paciente** com identificador interno, nome, nascimento, CPF quando informado, contatos e dados administrativos.
- **RF-011 [P0] Evitar duplicidade evidente** por CPF e sinalizar possíveis duplicatas por dados demográficos.
- **RF-012 [P1] Atualizar dados administrativos** sem misturar com registros clínicos.
- **RF-013 [P1] Registrar preferências de contato** e meios autorizados.
- **RF-014 [P1] Pesquisar paciente** por nome, CPF, telefone e identificador interno.

## 4. Agenda e fluxo de recepção
- **RF-020 [P0] Criar agendamento** associando paciente, médico, data/hora, tipo/modalidade e duração.
- **RF-021 [P0] Impedir conflito de agenda** do mesmo médico e bloqueios vigentes.
- **RF-022 [P1] Confirmar consulta** e armazenar canal/data da confirmação.
- **RF-023 [P1] Cancelar consulta** com motivo e autoria.
- **RF-024 [P1] Registrar ausência (no-show)** preservando histórico.
- **RF-025 [P1] Fazer check-in** e registrar chegada.
- **RF-026 [P1] Controlar sala de espera** com estado aguardando/em atendimento/finalizado.
- **RF-027 [P1] Manter fila de espera/repescagem** para pacientes interessados em antecipação.
- **RF-028 [P1] Liberar horário após cancelamento** para nova ocupação.
- **RF-029 [P1] Gerar lembrete/solicitação de confirmação** sem bloquear agendamento em caso de falha de mensageria.

## 5. Prontuário longitudinal
- **RF-030 [P0] Exibir resumo clínico antes do atendimento** contendo alertas, alergias/reação, medicamentos ativos, condições relevantes e pendências.
- **RF-031 [P0] Exibir linha do tempo clínica** ordenada por eventos.
- **RF-032 [P0] Registrar alergia/reação medicamentosa** com substância, reação, severidade, data, status e autor.
- **RF-033 [P0] Gerar alerta clínico** a partir de informação crítica ativa.
- **RF-034 [P1] Registrar medicamentos em uso** com nome, dose, via/frequência quando disponíveis, início/fim e status.
- **RF-035 [P1] Registrar condição/problema clínico** com estado e datas.
- **RF-036 [P1] Centralizar documentos clínicos** com metadados e vínculo ao paciente/atendimento.
- **RF-037 [P0] Auditar abertura de prontuário** por usuário e contexto.

## 6. Atendimento
- **RF-040 [P0] Iniciar atendimento** somente para profissional autorizado.
- **RF-041 [P0] Registrar evolução clínica** (queixa, história/avaliação, conduta).
- **RF-042 [P1] Salvar rascunho** sem caracterizá-lo como registro clínico final.
- **RF-043 [P0] Finalizar atendimento** com autor e timestamp.
- **RF-044 [P0] Proibir sobrescrita silenciosa de atendimento finalizado**.
- **RF-045 [P0] Registrar adendo/retificação** vinculado ao registro original.
- **RF-046 [P1] Permitir templates/formulários por especialidade** em evolução futura sem alterar o núcleo do atendimento.

## 7. Exames e resultados
- **RF-050 [P1] Solicitar exame** vinculado a paciente e atendimento.
- **RF-051 [P1] Acompanhar ciclo do exame**: solicitado, agendado/realizado, resultado recebido, revisado, cancelado.
- **RF-052 [P1] Definir prazo esperado/prioridade** quando aplicável.
- **RF-053 [P1] Anexar resultado** com documento e metadados.
- **RF-054 [P0] Registrar revisão do resultado por profissional** quando houver acompanhamento clínico.
- **RF-055 [P1] Sinalizar exame vencido/sem resultado** para fila operacional.

## 8. Retorno e continuidade do cuidado
- **RF-060 [P0] Criar acompanhamento** originado por atendimento, exame ou decisão manual autorizada.
- **RF-061 [P0] Acompanhamento deve possuir responsável, motivo, estado e prazo/condição**.
- **RF-062 [P1] Registrar tentativas de contato** sem conteúdo clínico desnecessário.
- **RF-063 [P1] Converter acompanhamento em agendamento** preservando rastreabilidade.
- **RF-064 [P1] Escalonar pendências vencidas** conforme prioridade.
- **RF-065 [P1] Encerrar acompanhamento** com resultado/resolução.

## 9. Financeiro do atendimento
- **RF-070 [P1] Criar lançamento financeiro associado ao atendimento**.
- **RF-071 [P1] Registrar pagador** (particular ou convênio preparado).
- **RF-072 [P1] Registrar valor, vencimento, forma e status de recebimento**.
- **RF-073 [P1] Estornar/cancelar sem apagar histórico**.
- **RF-074 [P2] Preparar modelo para convênio, guia, TUSS/TISS, glosa e repasse** sem obrigar implementação completa no MVP.

## 10. Indicadores e gestão
- **RF-080 [P1] Consultas por período/status/especialidade/médico**.
- **RF-081 [P1] Taxa de ausência e cancelamento**.
- **RF-082 [P1] Ocupação/capacidade da agenda**.
- **RF-083 [P1] Tempo entre agendamento e atendimento**.
- **RF-084 [P1] Pacientes novos e recorrentes**.
- **RF-085 [P1] Exames e acompanhamentos pendentes/vencidos**.
- **RF-086 [P1] Receita recebida/pendente do período**.
- **RF-087 [P0] Indicadores não devem expor conteúdo clínico detalhado a Gestão**.

## 11. Auditoria e conformidade
- **RF-090 [P0] Registrar eventos de auditoria** para autenticação relevante, prontuário, registros clínicos, permissões e alterações críticas.
- **RF-091 [P0] Consultar auditoria** por usuário, entidade, ação e período para perfil autorizado.
- **RF-092 [P0] Preservar antes/depois ou referência de versão** em mutações sensíveis.
- **RF-093 [P1] Exportar dados estruturados quando necessário** respeitando autorização e escopo.
- **RF-094 [P2] Preparar integração TISS/TUSS** para cenários de saúde suplementar aplicáveis.

## 12. Fora do MVP, mas arquiteturalmente previsto
Telemedicina, assinatura/prescrição digital, multiunidade, estoque, faturamento TISS completo, repasse médico, CRM/marketing e portal/app do paciente.

## 13. Rastreabilidade
- Caso Mariana: RF-030 a RF-045.
- Fragmentação de exames: RF-050 a RF-055.
- Falta de acompanhamento: RF-060 a RF-065.
- Ociosidade e recepção: RF-020 a RF-029.
- Gestão por dados: RF-080 a RF-087.
- Crescimento do corpo clínico: RF-003 a RF-005.
