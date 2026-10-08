package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.ClinicalRepository;

import br.com.clinicahans.model.scheduling.AppointmentStatus;
import br.com.clinicahans.model.clinical.Addendum;
import br.com.clinicahans.model.clinical.Alert;
import br.com.clinicahans.model.clinical.Allergy;
import br.com.clinicahans.model.clinical.ClinicalDocument;
import br.com.clinicahans.model.clinical.Condition;
import br.com.clinicahans.model.clinical.Encounter;
import br.com.clinicahans.model.clinical.Medication;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ClinicalUseCase {
    private final ClinicalRepository repository; private final AppointmentUseCase appointmentUseCase;
    private final UserIdentityService users; private final AuditUseCase auditUseCase;
    public ClinicalUseCase(ClinicalRepository repository,AppointmentUseCase appointmentUseCase,UserIdentityService users,AuditUseCase auditUseCase){
        this.repository=repository;this.appointmentUseCase=appointmentUseCase;this.users=users;this.auditUseCase=auditUseCase;
    }

    public ClinicalRepository.SafetySnapshot safetySnapshot(UUID patientId){
        assertPatientAccess(patientId);
        var snapshot=repository.safetySnapshot(patientId);
        auditUseCase.record("MEDICAL_RECORD_VIEWED","PATIENT",patientId);
        return snapshot;
    }

    public List<ClinicalRepository.TimelineEvent> timeline(UUID patientId,int limit){
        assertPatientAccess(patientId);
        auditUseCase.record("MEDICAL_TIMELINE_VIEWED","PATIENT",patientId);
        return repository.timeline(patientId,limit);
    }

    @Transactional
    public Encounter start(UUID appointmentId){
        var a=appointmentUseCase.get(appointmentId);
        if(!users.currentUserHasRole("ADMIN") && !users.currentDoctorId().equals(a.doctorId()))
            throw new BusinessRuleException("Médico autenticado não corresponde ao profissional do agendamento.");
        if(a.status()!=AppointmentStatus.CHECKED_IN) throw new BusinessRuleException("Atendimento exige consulta em check-in.");
        appointmentUseCase.transition(appointmentId,AppointmentStatus.IN_CARE,"Início do atendimento clínico");
        var encounter=repository.createEncounter(a.patientId(),a.doctorId(),a.id(),users.currentUserId());
        auditUseCase.record("ENCOUNTER_STARTED","ENCOUNTER",encounter.id());
        return encounter;
    }

    @Transactional
    public Encounter saveDraft(UUID id,String chief,String assessment,String plan,int version){
        var current = repository.getEncounter(id);
        assertEncounterOwnership(current);
        var result=repository.saveDraft(id,chief,assessment,plan,version);
        auditUseCase.recordPreviousValues(Map.of(
            "encounter.clinicalContent", "[REDACTED]",
            "encounter.version", current.version(),
            "encounter.status", current.status()));
        auditUseCase.record("ENCOUNTER_DRAFT_SAVED","ENCOUNTER",id); return result;
    }

    @Transactional
    public Encounter finalizeEncounter(UUID id,int version){
        var current=repository.getEncounter(id);
        assertEncounterOwnership(current);
        if(current.assessment()==null||current.assessment().isBlank()) throw new BusinessRuleException("Avaliação clínica é obrigatória para finalizar.");
        var result=repository.finalizeEncounter(id,version);
        auditUseCase.recordPreviousValues(Map.of("encounter.status", current.status(), "encounter.version", current.version()));
        appointmentUseCase.transition(current.appointmentId(),AppointmentStatus.COMPLETED,"Atendimento finalizado");
        auditUseCase.record("ENCOUNTER_FINALIZED","ENCOUNTER",id); return result;
    }

    @Transactional
    public Addendum addAddendum(UUID id,String reason,String content){
        assertEncounterOwnership(repository.getEncounter(id));
        var result=repository.addAddendum(id,users.currentUserId(),reason,content);
        auditUseCase.record("ENCOUNTER_ADDENDUM_CREATED","ENCOUNTER",id); return result;
    }

    private void assertEncounterOwnership(Encounter encounter) {
        if(!users.currentUserHasRole("ADMIN") && !users.currentDoctorId().equals(encounter.doctorId()))
            throw new BusinessRuleException("Somente o médico responsável pelo atendimento pode alterar/finalizar este registro.");
    }

    private void assertPatientAccess(UUID patientId) {
        if(!users.currentDoctorHasRelationshipWithPatient(patientId))
            throw new BusinessRuleException("Médico não possui relação assistencial registrada com este paciente.");
    }

    @Transactional
    public Medication addMedication(UUID patientId,String name,String dosage,String frequency,java.time.LocalDate startedOn){
        assertPatientAccess(patientId);
        var result=repository.createMedication(patientId,name,dosage,frequency,startedOn);
        auditUseCase.record("MEDICATION_CREATED","PATIENT",patientId); return result;
    }

    @Transactional
    public Condition addCondition(UUID patientId,String description,String status,java.time.LocalDate onsetDate){
        assertPatientAccess(patientId);
        var result=repository.createCondition(patientId,description,status,onsetDate);
        auditUseCase.record("CLINICAL_CONDITION_CREATED","PATIENT",patientId); return result;
    }

    @Transactional
    public Alert addAlert(UUID patientId,String type,String severity,String message){
        assertPatientAccess(patientId);
        var result=repository.createManualAlert(patientId,type,severity,message);
        auditUseCase.record("CLINICAL_ALERT_CREATED","PATIENT",patientId); return result;
    }

    @Transactional
    public void deactivateAlert(UUID patientId,UUID alertId){
        assertPatientAccess(patientId);
        repository.deactivateAlert(patientId,alertId);
        auditUseCase.recordPreviousValues(Map.of("clinicalAlert.active", true));
        auditUseCase.record("CLINICAL_ALERT_DEACTIVATED","PATIENT",patientId);
    }

    @Transactional
    public ClinicalDocument addDocument(UUID patientId,UUID encounterId,String type,String storageKey,String mimeType,String checksum){
        assertPatientAccess(patientId);
        if(encounterId!=null && !repository.getEncounter(encounterId).patientId().equals(patientId))
            throw new BusinessRuleException("Documento não pode ser associado a atendimento de outro paciente.");
        var result=repository.createDocument(patientId,encounterId,type,storageKey,mimeType,checksum);
        auditUseCase.record("CLINICAL_DOCUMENT_CREATED","PATIENT",patientId); return result;
    }

    public List<ClinicalDocument> documents(UUID patientId){
        assertPatientAccess(patientId);
        auditUseCase.record("CLINICAL_DOCUMENTS_VIEWED","PATIENT",patientId);
        return repository.documents(patientId);
    }

    @Transactional
    public Allergy addAllergy(UUID patientId,String substance,String reaction,String severity){
        assertPatientAccess(patientId);
        var result=repository.createAllergy(patientId,substance,reaction,severity,users.currentUserId());
        auditUseCase.record("ALLERGY_CREATED","PATIENT",patientId); return result;
    }
}
