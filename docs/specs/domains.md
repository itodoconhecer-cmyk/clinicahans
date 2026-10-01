# Catálogo de Domínios — Clínica Hans

## 1. Visão
A Clínica Hans é organizada em contextos de negócio com responsabilidades explícitas. O **Paciente** é a referência longitudinal, mas cada contexto mantém seus próprios agregados e invariantes.

## 2. Context Map

### Identity & Access
Autenticação, usuários, roles e identidade do profissional.  
**Entidades:** User, Role, UserRole.  
**Relacionamento crítico:** User 0..1 ↔ Doctor.

### Patient Registry
Identidade administrativa e contato.  
**Aggregate Root:** Patient.  
Não contém evolução clínica.

### Clinical Workforce
Médico, especialidades e capacidade.  
**Aggregate Root:** Doctor.  
**Entidades:** Specialty, DoctorSpecialty, DoctorAvailability, ScheduleBlock.

### Scheduling
Reserva de capacidade assistencial.  
**Aggregate Root:** Appointment.  
**Entidades:** AppointmentStatusHistory, WaitlistEntry.

### Clinical Record
Segurança clínica e prontuário longitudinal.  
**Agregados:** Encounter, Allergy, Medication, ClinicalCondition, ClinicalAlert, ClinicalDocument.  
**Projeções:** SafetySnapshot, Timeline.

### Care Continuity
Pendências e ações posteriores ao atendimento.  
**Agregados:** ExamOrder, FollowUp.  
**Entidades:** ExamResult, ResultReview, FollowUpAction.

### Billing
Consequência financeira do atendimento.  
**Aggregate Root:** Receivable.  
**Entidade:** Payment.

### Management
Leitura consolidada operacional/financeira.  
Não é fonte de verdade clínica.

### Audit
Trilha de ações sensíveis.  
**Aggregate Root:** AuditEvent.

### Integration
Desacoplamento de integrações externas.  
**Entidade atual:** NotificationOutbox.

## 3. Aggregates e invariantes

### Patient
- UUID;
- CPF opcional único;
- versionamento otimista em alterações administrativas.

### Doctor
- CRM+UF único;
- ACTIVE para novos agendamentos;
- userId único quando houver identidade digital vinculada.

### Appointment
**Estados:** SCHEDULED, CONFIRMED, CHECKED_IN, IN_CARE, COMPLETED, CANCELLED, NO_SHOW.

**Invariantes:**
- intervalo positivo;
- criação no futuro;
- dentro da disponibilidade;
- fora de bloqueio;
- sem sobreposição em estados ativos;
- transição válida.

### Encounter
**Estados:** DRAFT, FINAL.

**Invariantes:**
- paciente+médico+appointment coerentes;
- um Appointment gera no máximo um Encounter;
- apenas médico responsável altera, salvo Admin excepcional;
- FINAL não sofre update comum;
- correção usa Addendum;
- versão evita lost update.

### Allergy
HIGH/CRITICAL cria ClinicalAlert.

### ClinicalAlert
Ativo/inativo, origem rastreável, sem exclusão silenciosa.

### ExamOrder
Estados funcionais: REQUESTED, PERFORMED, RESULT_RECEIVED, REVIEWED, CANCELLED.  
Resultado recebido não significa revisado.

### FollowUp
Estados persistidos: OPEN, CLOSED.  
Estado derivado: OVERDUE quando OPEN e vencido.

### Receivable
Estados: OPEN, PARTIAL, PAID.  
Soma dos pagamentos não ultrapassa amount.

### AuditEvent
Append-only para usuários funcionais.

## 4. Value Objects conceituais
- CRM = número + UF.
- TimeRange = startsAt + endsAt.
- Money = amount (BRL no MVP).
- Severity = LOW | MEDIUM | HIGH | CRITICAL.
- Priority de follow-up = LOW | MEDIUM | HIGH | CRITICAL.
- Priority de exame = ROUTINE | HIGH | URGENT.
- CorrelationId = identificador técnico da requisição.

## 5. Políticas de domínio

### ClinicalAccessPolicy
- MEDICO vinculado a Doctor ativo;
- relação assistencial com Patient;
- ADMIN excepcional com auditoria;
- RECEPCAO/GESTAO sem conteúdo clínico detalhado.

### AppointmentCapacityPolicy
Slot válido = disponibilidade recorrente ∩ ausência de bloqueio ∩ ausência de consulta concorrente.

### ClinicalImmutabilityPolicy
Encounter FINAL só recebe Addendum.

### ContinuityPolicy
Encounter FINAL não encerra necessariamente a jornada quando existem exames, resultados a revisar ou follow-ups.

## 6. Eventos relevantes
- AppointmentScheduled → NotificationOutbox(APPOINTMENT_CONFIRMATION).
- AllergyRecorded(HIGH/CRITICAL) → ClinicalAlert.
- EncounterStarted → Appointment IN_CARE.
- EncounterFinalized → Appointment COMPLETED.
- ExamResultReceived → pendência de ResultReview.
- FollowUpDuePassed → projeção OVERDUE.
- WaitlistConverted → Appointment + Waitlist RESOLVED.

## 7. Dependências permitidas
- Scheduling → Patient Registry, Clinical Workforce, Identity.
- Clinical Record → Scheduling, Patient Registry, Identity.
- Care Continuity → Clinical Record, Patient Registry, Identity.
- Billing → Clinical Record.
- Management → Scheduling, Continuity, Billing em leitura.
- Audit → eventos dos demais contextos.
- Integration → eventos publicados pelos contextos.

## 8. Dependências a evitar
- Financeiro alterando estado clínico.
- Recepção conhecendo Encounter.
- Management consultando texto clínico.
- Provedor de notificação dentro da regra de Appointment.
- TISS/TUSS contaminando o núcleo antes de necessidade real.
- UI definindo autorização/transição crítica.

## 9. Domínio → pacote backend

| Domínio | Pacote |
|---|---|
| Identity & Access | auth, admin, security, config |
| Patient Registry | patient |
| Clinical Workforce | doctor |
| Scheduling | appointment, waitlist |
| Clinical Record | clinical |
| Care Continuity | continuity |
| Billing | finance |
| Management | management |
| Audit | audit |
| Integration | notification_outbox no SQL; adaptador futuro |

## 10. Domínio → frontend
O frontend trabalha com tarefas, não replica aggregates:
- Recepção: agenda, pacientes, fila, financeiro operacional.
- Médico: agenda, prontuário, atendimento, exames, follow-ups.
- Gestão: médicos, disponibilidade, financeiro, indicadores.
- Admin: usuários, vínculos e auditoria.

## 11. Glossário
- **Safety Snapshot:** resumo clínico de segurança pré-atendimento.
- **Relação assistencial:** vínculo demonstrado por Appointment/Encounter.
- **Adendo:** correção pós-finalização preservando o original.
- **Follow-up:** obrigação de continuidade com responsável e prazo.
- **Repescagem:** conversão da waitlist em agendamento.
- **Outbox:** fila transacional para integração assíncrona.
