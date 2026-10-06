# Revisão Técnica Integrada Rigorosa — Clínica Hans

**Data:** 06/10/2026  
**Escopo:** Prompts 02, 03, 04 e 05; especificações; diagramas; banco; backend; frontend; testes; CI; operação e referências de saúde/privacidade.  
**Parecer atual:** **NO-GO PARA PRODUÇÃO**.

> O projeto evoluiu de protótipo para uma base técnica coerente, mas ainda não deve ser tratado como sistema clínico pronto para produção. CI verde anterior comprovava compilação e sintaxe; não comprovava autorização contextual, concorrência, operação, segurança ou conformidade.

## 1. Scorecard

| Eixo | Nota | Parecer |
|---|---:|---|
| Aderência ao problema/produto | 8/10 | Boa visão longitudinal; alguns fluxos especificados ainda incompletos |
| Modelagem de domínio | 7/10 | Contextos e invariantes bons; ciclos de vida ainda têm gaps |
| Autorização e privacidade | 6/10 | Melhorou nesta revisão; ainda falta break-glass formal e auditoria completa |
| Integridade/concorrência | 7/10 | Agenda forte; pagamento e revisão reforçados; faltam mais testes concorrentes |
| Backend/API | 6/10 | Funcional, mas DTOs vazam persistência e contratos ainda são pouco refinados |
| Banco/migrations | 7/10 | Constraints críticas adicionadas; runner ainda não é robusto para múltiplas instâncias/checksum |
| Frontend/UX | 5/10 | Cobertura ampla, porém monolítico, sem E2E e com UUID técnico em vários fluxos |
| Testes/CI | 6/10 | Agora inclui PostgreSQL real; cobertura de integração/E2E ainda insuficiente |
| Observabilidade/operação | 3/10 | Sem deploy da aplicação, TLS comprovado, backup/restore, alertas e runbooks |
| Prontidão regulatória/saúde | 4/10 | Boas intenções; não há evidência para declarar conformidade/certificação |
| **Geral** | **5,9/10** | **Base promissora; não pronta para produção clínica** |

## 2. Correções P0/P1 aplicadas nesta revisão

### FIX-001 — JWT confiava em roles antigas e usuário desativado continuava válido
**Severidade original:** P0.  
**Evidência:** `JwtAuthenticationFilter` usava roles contidas no token sem consultar estado atual da conta.  
**Cenário:** Admin desativa um usuário, mas JWT emitido anteriormente continua autorizando até expirar.  
**Correção:** filtro recarrega usuário ativo e roles atuais do banco em cada requisição.  
**Teste:** `JwtAuthenticationFilterTest`.

### FIX-002 — Médico enumerava pacientes da clínica
**Severidade original:** P0.  
**Evidência:** `GET /api/v1/patients` permitia MEDICO e `PatientRepository.search` não tinha escopo.  
**Correção:** busca do médico limitada a pacientes com relação assistencial válida; cancelamento/no-show não criam relação.

### FIX-003 — Médico listava agenda de outros médicos
**Severidade original:** P0.  
**Correção:** `AppointmentService` força `doctorId` do usuário médico quando ele não possui papel operacional adicional.

### FIX-004 — Médico podia listar/receber/revisar exame de outro profissional
**Severidade original:** P0.  
**Correção:** escopo por Encounter/Doctor em `ContinuityService`; lista pendente agora é filtrada por médico.  
**Teste:** `ContinuityServiceTest`.

### FIX-005 — Médico via follow-ups de toda a clínica
**Severidade original:** P0/P1.  
**Correção:** fila e ações de médico são filtradas por ownership/Encounter; Recepção preserva visão operacional mínima.

### FIX-006 — ADMIN tinha passe livre sobre conteúdo clínico
**Severidade original:** P0.  
**Evidência:** controllers clínicos aceitavam ADMIN, enquanto a regra dizia acesso excepcional/auditado.  
**Correção:** acesso clínico direto de ADMIN foi removido até existir mecanismo formal de break-glass.

### FIX-007 — Corrida de pagamento permitia overpayment
**Severidade original:** P0.  
**Evidência:** duas transações podiam ler o mesmo total pago e inserir pagamentos simultâneos.  
**Correção:** `SELECT ... FOR UPDATE` no Receivable.  
**Teste:** integração concorrente em PostgreSQL real.

### FIX-008 — Revisão de resultado não era protegida contra corrida
**Severidade original:** P0/P1.  
**Correção:** constraint única `uq_result_review_exam_result`.

### FIX-009 — Estados críticos dependiam excessivamente do Java
**Severidade:** P1.  
**Correção:** migration V004 adicionou CHECK constraints para Appointment, Encounter, Allergy, Condition, Alert, ExamOrder, FollowUp, Receivable, Payment e Waitlist.

### FIX-010 — Disponibilidade usava timezone do payload
**Severidade original:** P0/P1.  
**Cenário:** frontend converte `datetime-local` para UTC; backend comparava `LocalTime` em UTC com disponibilidade da clínica.  
**Correção:** `BUSINESS_ZONE=America/Sao_Paulo` e conversão por instante antes de validar dia/hora.

### FIX-011 — Mutação podia persistir sem auditoria
**Severidade original:** P1.  
**Correção:** fronteiras `@Transactional` adicionadas às mutações de paciente, médico, clínica, continuidade, waitlist, financeiro e administração.

### FIX-012 — CI não usava PostgreSQL real
**Severidade original:** P1.  
**Correção:** Backend CI passa a usar PostgreSQL 16 e `mvn clean verify`; teste de integração valida V004 e corrida de pagamento.

## 3. Bloqueadores ainda abertos

### P0-001 — Não existe ambiente de produção da aplicação
Não há deploy persistente do backend/frontend, terminação TLS, reverse proxy/gateway, secret store, política de rede ou estratégia de rollback comprovada.

**Impacto:** impossível afirmar disponibilidade, HTTPS, isolamento de secrets ou comportamento operacional real.

**Para fechar:** IaC/deploy mínimo, TLS, segregação de ambiente, secrets, health/readiness externos, rollback e smoke test.

### P0-002 — Backup/restore e recuperação não estão comprovados
RNF-031–033 prometem backup, RPO/RTO e restore drill, mas só existe volume local do PostgreSQL em compose.

**Impacto:** perda de prontuário/financeiro sem recuperação demonstrável.

**Para fechar:** backup criptografado, retenção, restore automatizado testado e evidência de RPO/RTO.

## 4. Achados P1 altos

### P1-001 — Break-glass clínico não existe
A correção segura foi negar ADMIN diretamente. Ainda falta operação excepcional formal com:
- motivo obrigatório;
- janela curta;
- paciente/escopo explícito;
- auditoria dedicada;
- alerta/revisão posterior.

### P1-002 — Login sem proteção contra abuso
Não há rate limiting, atraso progressivo, lockout controlado ou mecanismo equivalente contra credential stuffing/brute force.

OWASP ASVS 5 inclui controles específicos contra ataques de autenticação e exige verificação robusta de sessão.

### P1-003 — Auditoria é incompleta
`audit_event` possui `source_ip`, mas `AuditService` não o preenche. Também faltam:
- login bem/mal sucedido;
- acesso negado;
- before/after ou referência robusta de versão para RF-092;
- filtros por período/usuário;
- proteção operacional contra alteração direta por conta de banco;
- política de retenção.

### P1-004 — Runner de migration não é seguro para múltiplas instâncias
Não há advisory lock/leader election nem checksum do script aplicado.

**Risco:** duas instâncias iniciando juntas podem tentar executar a mesma migration; alteração posterior de um script já aplicado não é detectada.

### P1-005 — DTO de API acoplado à persistência
Controllers retornam records de Repository diretamente.

**Impacto:** evolução de schema vaza para API, minimização de dados fica mais difícil e o Prompt 03 dizia explicitamente separar DTO/domínio/persistência.

### P1-006 — Indicadores não cumprem integralmente RF-080–086
O backend atual entrega apenas parte:
- agendamentos;
- no-show;
- cancelamentos;
- follow-ups abertos;
- exames pendentes;
- recebíveis brutos.

Faltam ocupação/capacidade, tempo até consulta, pacientes novos/recorrentes, receita recebida x pendente, filtros por médico/especialidade. Além disso, follow-ups/exames atuais são globais mesmo quando o dashboard recebe período.

### P1-007 — Estorno/cancelamento financeiro não existe
RF-073/RN-051 exigem preservar lançamento original e motivo. Não há endpoint/modelo de estorno.

### P1-008 — Check-in não respeita janela temporal
RN-018 está documentada, mas qualquer Appointment elegível por estado pode receber CHECKED_IN sem regra de antecedência/atraso.

### P1-009 — Notificação é somente outbox
Agendamento cria `notification_outbox`, mas não existe consumer, retry worker, dead-letter, fornecedor ou confirmação de entrega.

### P1-010 — Documento clínico é somente metadado
`storageKey` é aceito como string fornecida pelo usuário; não existe storage real, upload assinado, antivírus, validação de arquivo ou autorização de download.

### P1-011 — CPF não é canonizado/validado completamente
A regex aceita formato com e sem pontuação, e o banco persiste a string. O mesmo CPF pode ter representações diferentes se não houver normalização consistente; não há validação de dígitos verificadores.

### P1-012 — Frontend sem testes E2E
O Frontend CI valida sintaxe e existência de arquivos. Nenhum fluxo de usuário é executado.

### P1-013 — Frontend viola a arquitetura definida no próprio Prompt 04
`frontend/app.js` concentra roteamento e grande parte das views. A estrutura prometida `views/` por tarefa não foi implementada.

### P1-014 — UX ainda expõe UUID técnico
Agenda, waitlist, exames e financeiro exibem ou pedem UUID em vários fluxos. Isso é inadequado para operação de recepção/médico e aumenta erro humano.

### P1-015 — Swagger é público e Actuator não tem política por ambiente
Swagger/OpenAPI está `permitAll`; `metrics` fica disponível para qualquer usuário autenticado. Em produção isso deve ser configurado separadamente.

### P1-016 — Sem headers de segurança/CSP de produção
Não há CSP, HSTS, frame-ancestors/X-Frame-Options e política explícita de headers.

## 5. Achados P2 médios

- paginação é limite simples, sem cursor/offset consistente;
- disponibilidade e bloqueios não possuem ciclo de edição/inativação completo;
- especialidade não possui remoção/inativação/vigência;
- Patient status existe sem API de inativação;
- Doctor status é criado, mas não há endpoint de atualização;
- Medication/Condition não têm fluxo completo de encerrar/inativar;
- Allergy não possui inativação/correção;
- ResultReview não expõe histórico completo;
- FollowUp não possui motivo estruturado de encerramento;
- Waitlist não possui cancelamento/desistência;
- métricas não guardam versão da definição;
- errors 401/403 gerados pelo Spring não usam necessariamente o mesmo envelope `ApiError`;
- `GlobalExceptionHandler` não registra stack/correlationId em log de servidor para erro 500;
- acessibilidade de modal não possui focus trap/ESC;
- não há teste de restauração de sessão/expiração no frontend.

## 6. Revisão de requisitos regulatórios e de saúde

### LGPD/ANPD
Dados de saúde são dados pessoais sensíveis e a ANPD reforça a necessidade de medidas técnicas/administrativas contra acesso não autorizado e tratamento inadequado. O projeto deve ser avaliado como tratamento de risco elevado conforme escala/contexto, e não basta possuir JWT para alegar adequação.

Referências:
- ANPD — Segurança da informação e dados sensíveis: https://www.gov.br/anpd/
- Guia de Segurança da Informação para agentes de tratamento.
- Agenda regulatória ANPD com tema específico de dados de saúde.

### CFM / prontuário eletrônico
A Resolução CFM nº 1.821/2007 e referências posteriores tratam de guarda/manuseio de prontuário eletrônico e requisitos técnicos aplicáveis. O Parecer CFM nº 19/2026 também reforça rastreabilidade e sigilo em descarte/guarda.

**Decisão de revisão:** o projeto não deve declarar certificação SBIS/CFM, NGS2 ou conformidade integral sem avaliação específica e evidência.

### TISS/TUSS
Em saúde suplementar, TISS é padrão obrigatório para trocas eletrônicas aplicáveis e possui componentes específicos, inclusive Segurança e Privacidade. A arquitetura está apenas preparada; **não está implementada**.

### OWASP ASVS 5.0
Usar ASVS 5 como checklist de AppSec, especialmente capítulos de Authentication, Session Management, Authorization, Self-contained Tokens, Data Protection, Configuration e Security Logging.

## 7. Prompts revisitados

### Prompt 02
**Antes:** especificação forte em domínio, mas não exigia prova de implementação, row-level auth, idempotência/concorrência e matriz completa.  
**Agora:** exige rastreabilidade, classificação de dados, escopo contextual, lifecycle, timezone e status baseado em evidência.

### Prompt 03
**Antes:** exigia segurança em termos gerais, mas permitiu CI baseado em mocks e não exigiu concorrência real/role freshness.  
**Agora:** exige PostgreSQL real, row-level auth, revogação, concorrência, timezone, auditabilidade e zero P0 aberto.

### Prompt 04
**Antes:** “principais APIs integradas” permitiu considerar tela pronta só por existir.  
**Agora:** inventário é vinculante, cada tela exige rota + ação + API + estados + teste e proíbe UUID como UX operacional.

### Prompt 05
**Antes:** era uma checklist curta e subjetiva.  
**Agora:** funciona como Architecture Review Board/AppSec/QA com severidade, evidência, correção, testes e decisão GO/NO-GO.

## 8. Rastreabilidade e honestidade de status
Foi criado `docs/specs/traceability-matrix.md`.  
O `ui-screen-inventory.md` foi reclassificado: telas sem E2E são **PARCIAL**, ainda que já exista código.

## 9. Próximas ações obrigatórias para sair de NO-GO

Ordem recomendada:
1. fechar deploy seguro + TLS + secrets;
2. implementar backup/restore e executar restore drill;
3. break-glass;
4. rate limit/autenticação;
5. completar audit trail;
6. robustecer migration runner;
7. DTOs/minimização;
8. completar indicadores e financeiro;
9. storage de documentos + consumer de outbox;
10. refatorar frontend em views e remover UUID da UX;
11. adicionar E2E por perfil;
12. revisão AppSec/OWASP + homologação clínica.

## 10. Parecer final

**NO-GO PARA PRODUÇÃO CLÍNICA.**

O projeto **fica de pé como arquitetura evolutiva e MVP de engenharia**, e melhorou significativamente nesta revisão. Porém, não é correto apresentá-lo como sistema clínico pronto ou conforme apenas porque compila, possui JWT e tem telas.

A saída de NO-GO exige, no mínimo, zero P0 aberto e aceite explícito dos P1 residuais.


## 11. Evidência de validação após a revisão

A primeira execução do novo Backend CI falhou ao carregar o contexto Spring por ambiguidade de `CorsConfigurationSource`. Esse defeito não era detectado pelo CI anterior baseado apenas nos testes unitários existentes. A configuração foi corrigida com `@Qualifier("corsConfigurationSource")`.

Validação final:
- **Frontend CI #15:** success.
- **Backend CI #65:** success.
- Backend CI usa **PostgreSQL 16 real**.
- Gate executado: `mvn -B -ntp clean verify`.
- Migrations V001–V004 executadas durante o contexto de integração.
- Teste de concorrência financeira executado contra PostgreSQL real.
- Testes de revogação/role freshness do JWT e escopo médico de exames executados.
- PR técnico de validação: **#4**.
- Merge de validação: `beede11cee039ebf2cb191534ee11c71f85727eb`.

O sucesso desses gates **não altera o parecer NO-GO para produção**, pois os bloqueadores operacionais (deploy seguro e backup/restore comprovado) permanecem abertos.
