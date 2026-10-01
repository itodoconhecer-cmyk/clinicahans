# Especificação Funcional Consolidada — Clínica Hans

## 1. Propósito
Este documento é a visão funcional de referência do sistema da Clínica Hans. Consolida história, requisitos, regras, protótipos e backend implementado em uma documentação orientada a produto, operação e validação.

Princípio central: **a informação correta deve estar disponível à pessoa autorizada, no momento correto, ao longo de toda a jornada do paciente**.

## 2. Escopo do MVP
O MVP cobre:
1. autenticação e perfis;
2. pacientes;
3. médicos, especialidades e disponibilidade;
4. agenda, confirmação, cancelamento, ausência e check-in;
5. fila de espera/repescagem;
6. prontuário longitudinal e safety snapshot;
7. atendimento clínico;
8. alergias, medicamentos, condições, alertas e documentos;
9. exames, resultados e revisão;
10. acompanhamento/retorno;
11. financeiro básico;
12. indicadores de gestão;
13. auditoria administrativa e clínica.

Ficam preparados para evolução: TISS/TUSS, convênios avançados, prescrição/assinatura digital, telemedicina, multiunidade, repasse médico, estoque e portal do paciente.

## 3. Atores e responsabilidades

| Ator | Responsabilidade principal | Conteúdo clínico |
|---|---|---|
| Recepção | paciente administrativo, agenda, check-in, fila de espera, follow-up operacional, cobrança básica | não acessa evolução clínica |
| Médico | prontuário, safety snapshot, atendimento, alergias, medicamentos, condições, exames e follow-up clínico | acesso condicionado à relação assistencial |
| Gestão | médicos, especialidades, disponibilidade, indicadores e financeiro | sem evolução clínica detalhada |
| Administrador | usuários, vínculos, auditoria e operação excepcional | acesso técnico/administrativo controlado |
| Paciente | origem/destino da jornada; no MVP não possui portal autenticado | não aplicável no MVP |
| Serviço de notificação | entrega futura de confirmações/lembretes via outbox | somente dados mínimos de comunicação |

## 4. Matriz funcional de permissões

| Capacidade | Recepção | Médico | Gestão | Admin |
|---|:---:|:---:|:---:|:---:|
| Pesquisar paciente | ✓ | ✓ | — | ✓ |
| Cadastrar/editar paciente administrativo | ✓ | — | — | ✓ |
| Pesquisar médico/especialidade | ✓ | ✓ | ✓ | ✓ |
| Cadastrar médico/especialidade | — | — | ✓ | ✓ |
| Configurar disponibilidade/bloqueio | — | — | ✓ | ✓ |
| Agendar | ✓ | — | — | ✓ |
| Confirmar/cancelar/check-in/no-show | ✓ | — | — | ✓ |
| Fila de espera | ✓ | — | — | ✓ |
| Safety snapshot/timeline | — | ✓ | — | ✓ |
| Atendimento clínico | — | ✓ | — | ✓* |
| Alergia/medicação/condição/alerta | — | ✓ | — | ✓* |
| Exame/revisão | — | ✓ | — | ✓* |
| Follow-up operacional | ✓ | ✓ | — | ✓ |
| Financeiro | ✓ | — | ✓ | ✓ |
| Indicadores | — | — | ✓ | ✓ |
| Auditoria | — | — | — | ✓ |

\* Operação administrativa excepcional deve permanecer auditada.

## 5. Domínio Identidade e Acesso

### F-IA-01 — Login
**Entrada:** username e password.  
**Resultado:** JWT, tipo Bearer e roles.

**Critérios de aceite:**
- usuário inativo não autentica;
- mensagem de erro não indica se usuário existe;
- token expirado/inválido não autoriza chamadas;
- nenhuma senha padrão é versionada.

### F-IA-02 — Gestão de usuários
Admin cria usuário, atribui roles e pode desativá-lo.

### F-IA-03 — Vínculo usuário↔médico
Usuário com role MEDICO precisa estar vinculado a um cadastro de médico ativo para executar atos clínicos em nome daquele profissional.

## 6. Domínio Paciente

### F-PA-01 — Cadastrar paciente
Campos mínimos: nome completo e nascimento. CPF, telefone e e-mail são administrativos quando informados.

### F-PA-02 — Pesquisar paciente
Busca por nome, CPF ou telefone.

### F-PA-03 — Atualizar cadastro
Atualização usa versão para evitar perda silenciosa de alterações concorrentes.

### Regras-chave
- ID interno é UUID;
- CPF informado é único;
- recepção não registra evolução clínica no cadastro administrativo;
- dados clínicos são mantidos em agregados próprios.

## 7. Domínio Corpo Clínico

### F-ME-01 — Cadastrar médico
Nome, CPF opcional, CRM, UF, RQE, contato, status, modalidade e duração padrão.

### F-ME-02 — Especialidades
Cadastro de especialidade e vínculo médico↔especialidade, incluindo indicação de principal.

### F-ME-03 — Disponibilidade recorrente
Faixas por dia da semana com duração de slot.

### F-ME-04 — Bloqueios
Bloqueios temporários têm precedência sobre disponibilidade recorrente.

### Regras-chave
- CRM+UF é único;
- médico não ACTIVE não recebe novo agendamento;
- agenda só aceita intervalo coberto pela disponibilidade;
- bloqueio invalida o slot mesmo que exista disponibilidade recorrente.

## 8. Domínio Agenda

### F-AG-01 — Criar agendamento
Seleciona paciente, médico, início, duração e modalidade.

**Validações:**
1. paciente existe;
2. médico está ativo;
3. início não está no passado;
4. período está dentro da disponibilidade;
5. não há bloqueio;
6. não há sobreposição com consulta ativa.

### F-AG-02 — Estados do agendamento
`SCHEDULED → CONFIRMED → CHECKED_IN → IN_CARE → COMPLETED`

Saídas alternativas:
- `SCHEDULED/CONFIRMED → CANCELLED`
- `SCHEDULED/CONFIRMED → NO_SHOW`
- `CHECKED_IN → CANCELLED` em exceção operacional.

Estados finais: COMPLETED, CANCELLED, NO_SHOW.

### F-AG-03 — Histórico
Toda transição é registrada com origem, destino, autor, data e motivo quando aplicável.

### F-AG-04 — Confirmação e notificações
Ao criar agendamento, evento de confirmação é colocado na outbox. Falha futura de mensageria não desfaz o agendamento.

### F-AG-05 — Fila de espera
Recepção registra paciente por médico ou especialidade, preferência temporal e prioridade.

### F-AG-06 — Repescagem
Entrada WAITING pode ser convertida em agendamento válido e então marcada RESOLVED.

## 9. Domínio Prontuário e Segurança do Paciente

### F-CL-01 — Relação assistencial
Médico só consulta prontuário de paciente com relação assistencial registrada por agendamento ou atendimento, salvo Admin.

### F-CL-02 — Safety snapshot
Antes do atendimento, consolidar:
- alertas ativos;
- alergias/reações;
- medicamentos ativos;
- condições não resolvidas.

A abertura é auditada.

### F-CL-03 — Timeline
Linha temporal unificada de atendimentos, alergias, exames e follow-ups.

### F-CL-04 — Alergia/reação
Registro contém substância, reação e severidade. Severidade HIGH/CRITICAL cria alerta ativo.

### F-CL-05 — Medicamentos
Registro de nome, dose, frequência e data de início.

### F-CL-06 — Condições
Registro de condição/problema com estado ACTIVE, CONTROLLED ou RESOLVED.

### F-CL-07 — Alertas
Podem ser derivados ou manuais. Desativação é auditada; não há exclusão silenciosa.

### F-CL-08 — Documentos
Metadados e storageKey são persistidos; binário não integra o banco relacional do MVP.

## 10. Domínio Atendimento

### F-AT-01 — Iniciar atendimento
Pré-condições:
- agendamento em CHECKED_IN;
- usuário médico corresponde ao médico do agendamento.

Ao iniciar:
- agenda vai para IN_CARE;
- Encounter é criado em DRAFT.

### F-AT-02 — Salvar rascunho
Médico responsável atualiza queixa, avaliação e plano usando versão otimista.

### F-AT-03 — Finalizar
Avaliação é obrigatória. Encounter vai para FINAL e agendamento para COMPLETED.

### F-AT-04 — Imutabilidade
Encounter FINAL não é editado no fluxo comum.

### F-AT-05 — Adendo
Correção pós-finalização cria entidade de adendo com autor, motivo, conteúdo e data, sem alterar o original.

## 11. Domínio Exames

### F-EX-01 — Solicitar
Pedido nasce de atendimento e registra paciente, solicitante, nome, prioridade e prazo opcional.

### F-EX-02 — Receber resultado
Resultado usa storageKey + MIME e muda pedido para RESULT_RECEIVED.

### F-EX-03 — Revisar resultado
Revisão é ação clínica distinta, com profissional/data. Pedido passa para REVIEWED.

### F-EX-04 — Pendências
Fila mostra pedidos ainda não REVIEWED/CANCELLED, priorizados por prazo.

## 12. Domínio Continuidade

### F-CO-01 — Criar follow-up
Campos: paciente, atendimento opcional, responsável, motivo, prioridade, prazo e estado.

### F-CO-02 — Estado efetivo
Follow-up OPEN com prazo vencido é apresentado operacionalmente como OVERDUE.

### F-CO-03 — Registrar ação
Cada tentativa/ação recebe ator, tipo, nota e data.

### F-CO-04 — Concluir
Conclusão é explícita e registra closedAt.

### Privacidade operacional
Recepção recebe apenas dados suficientes para contatar/agendar, sem texto clínico desnecessário.

## 13. Domínio Financeiro

### F-FI-01 — Recebível
Só pode ser criado para atendimento FINAL.

### F-FI-02 — Pagador
Tipos atuais: PRIVATE ou INSURANCE preparado.

### F-FI-03 — Pagamento
Valor acumulado não pode exceder o recebível. Status pode ficar OPEN, PARTIAL ou PAID.

### F-FI-04 — Separação clínica/financeira
Status financeiro não muda status clínico e vice-versa.

## 14. Gestão e Indicadores

### F-GE-01 — Dashboard
Período informado retorna:
- total de agendamentos;
- faltas;
- cancelamentos;
- taxa de no-show;
- follow-ups abertos;
- exames pendentes;
- recebíveis brutos.

### F-GE-02 — Privacidade
Indicadores não retornam texto de prontuário.

## 15. Auditoria

### F-AU-01 — Eventos
Ações sensíveis geram AuditEvent com usuário, ação, tipo de entidade, ID, correlationId e horário.

### F-AU-02 — Consulta
Somente Admin consulta auditoria.

## 16. Contratos funcionais tela → API

| Tela/fluxo | API principal |
|---|---|
| Login | POST /api/v1/auth/login |
| Pacientes | GET/POST/PUT /api/v1/patients |
| Médicos | /api/v1/doctors, /specialties, /availability, /blocks |
| Agenda | GET/POST /api/v1/appointments + /transition |
| Fila de espera | /api/v1/waitlist |
| Prontuário | /api/v1/clinical/patients/{id}/safety-snapshot, /timeline |
| Atendimento | /api/v1/clinical/encounters/* |
| Alergias/medicações/condições | /api/v1/clinical/patients/{id}/* |
| Exames | /api/v1/continuity/exams/* |
| Follow-ups | /api/v1/continuity/follow-ups/* |
| Financeiro | /api/v1/finance/* |
| Indicadores | /api/v1/management/dashboard |
| Auditoria | /api/v1/audit |

## 17. Cenário de aceite ponta a ponta — Mariana
1. Recepção encontra Mariana.
2. Agenda consulta com médico disponível.
3. Mariana é confirmada e realiza check-in.
4. Médico autenticado abre safety snapshot.
5. Sistema audita a leitura e mostra reação medicamentosa crítica.
6. Médico inicia Encounter.
7. Registra avaliação, exame e follow-up.
8. Finaliza atendimento.
9. Resultado é recebido posteriormente.
10. Resultado permanece pendente até revisão médica.
11. Follow-up permanece aberto/vencido até ação/conclusão.
12. Gestão observa apenas indicadores agregados.

## 18. Definition of Done funcional
Uma capacidade está funcionalmente pronta quando:
- respeita ator e permissão;
- possui estados e transições definidos;
- regras críticas são validadas no backend;
- apresenta loading/erro/vazio/sucesso no frontend;
- possui rastreabilidade para requisito/regra;
- ações sensíveis são auditadas;
- nenhum dado clínico é exposto a perfil indevido.
