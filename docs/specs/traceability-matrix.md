# Matriz de Rastreabilidade — Clínica Hans

Revisão rigorosa: 06/10/2026.

Legenda:
- **IMPLEMENTADO_E_VERIFICADO**: código + teste adequado à criticidade.
- **PARCIAL**: código existe, mas falta teste/controle/fluxo necessário.
- **PLANEJADO**: requisito documentado sem implementação suficiente.
- **FORA_DO_MVP**: explicitamente adiado.

| Problema/objetivo | RF/RN | Domínio | API/implementação | Tela | Evidência de teste | Status |
|---|---|---|---|---|---|---|
| Autenticação individual | RF-001, RNF-002/003 | Identity | /auth/login, JWT/BCrypt | Login | unitário de filtro/revogação; sem brute-force/E2E | PARCIAL |
| Revogar usuário desativado | RN-063, RNF-009 | Identity | JwtAuthenticationFilter recarrega usuário/roles | Usuários | JwtAuthenticationFilterTest | IMPLEMENTADO_E_VERIFICADO |
| Escopo médico de paciente | RF-002/006, RN-064 | Patient/Clinical | PatientService + ClinicalAccessPolicy | Pacientes/Prontuário | cobertura clínica parcial; falta integração | PARCIAL |
| Conflito de agenda | RF-021, RN-014 | Scheduling | EXCLUDE gist + service | Agenda | unitário + migration real no CI | IMPLEMENTADO_E_VERIFICADO |
| Disponibilidade no fuso da clínica | RNF-023 | Scheduling | business-zone America/Sao_Paulo | Agenda | falta teste dedicado UTC↔SP | PARCIAL |
| Check-in por janela elegível | RN-018 | Scheduling | transição existe; janela não existe | Agenda | — | PLANEJADO |
| Waitlist/repescagem | RF-027 | Scheduling | /waitlist | Fila | sem E2E | PARCIAL |
| Safety snapshot | RF-030, RN-021 | Clinical Record | /safety-snapshot | Prontuário | sem integração/E2E | PARCIAL |
| Imutabilidade de encounter final | RF-044/045 | Clinical Record | status FINAL + addendum | Atendimento | unitário parcial | PARCIAL |
| Break-glass administrativo | matriz funcional/RNF-004 | Clinical Access | acesso ADMIN direto removido; fluxo break-glass ausente | — | — | PLANEJADO |
| Exame recebido ≠ revisado | RF-051/054, RN-032/034 | Continuity | exam_result/result_review | Exames | constraint única + teste de escopo; falta concorrência específica | PARCIAL |
| Escopo médico de exames | RF-002, RN-064 | Continuity | ContinuityService/queries por doctor | Exames | ContinuityServiceTest | IMPLEMENTADO_E_VERIFICADO |
| Follow-up operacional | RF-060–065 | Continuity | /follow-ups | Retornos | sem E2E; escopo médico corrigido | PARCIAL |
| Pagamento sem overpayment concorrente | RF-072 | Billing | SELECT FOR UPDATE | Faturamento | CriticalDatabaseIntegrationTest | IMPLEMENTADO_E_VERIFICADO |
| Estorno/cancelamento financeiro | RF-073, RN-051 | Billing | não implementado | Faturamento | — | PLANEJADO |
| Indicadores essenciais | RF-080–087 | Management | dashboard parcial | Indicadores | sem testes de definição | PARCIAL |
| Auditoria de leitura clínica | RF-037/RF-090 | Audit | AuditService | Prontuário | sem integração específica | PARCIAL |
| Auditoria de login/negação/before-after | RF-090–092 | Audit | incompleta | Auditoria | — | PLANEJADO |
| Documentos clínicos | RF-036/053 | Clinical Record | metadata/storageKey apenas | Prontuário | sem storage real/E2E | PARCIAL |
| Notificação de confirmação | RF-029 | Integration | outbox criada | Agenda | consumer ausente | PARCIAL |
| TISS/TUSS | RF-074/094 | Integration/Billing | arquitetura preparada | — | — | FORA_DO_MVP |
| Backup/restore | RNF-031–033 | Operations | não implementado/comprovado | — | — | PLANEJADO |
| Deploy HTTPS/produção | RNF-001/030 | Operations | não existe ambiente app publicado | — | — | PLANEJADO |
| E2E frontend por perfil | Prompt 04 | Frontend | CI só sintaxe | todas | ausente | PLANEJADO |
