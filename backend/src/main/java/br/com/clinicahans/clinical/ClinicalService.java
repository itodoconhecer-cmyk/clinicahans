package br.com.clinicahans.clinical;

import br.com.clinicahans.appointment.AppointmentService;
import br.com.clinicahans.appointment.AppointmentStatus;
import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ClinicalService {
    private final ClinicalRepository repository; private final AppointmentService appointments;
    private final UserIdentityService users; private final AuditService audit;
    public ClinicalService(ClinicalRepository repository,AppointmentService appointments,UserIdentityService users,AuditService audit){
        this.repository=repository;this.appointments=appointments;this.users=users;this.audit=audit;
    }

    public ClinicalRepository.SafetySnapshot safetySnapshot(UUID patientId){
        var snapshot=repository.safetySnapshot(patientId);
        audit.record("MEDICAL_RECORD_VIEWED","PATIENT",patientId);
        return snapshot;
    }

    public List<ClinicalRepository.TimelineEvent> timeline(UUID patientId,int limit){
        audit.record("MEDICAL_TIMELINE_VIEWED","PATIENT",patientId);
        return repository.timeline(patientId,limit);
    }

    @Transactional
    public ClinicalRepository.Encounter start(UUID appointmentId){
        var a=appointments.get(appointmentId);
        if(a.status()!=AppointmentStatus.CHECKED_IN) throw new BusinessRuleException("Atendimento exige consulta em check-in.");
        appointments.transition(appointmentId,AppointmentStatus.IN_CARE,"Início do atendimento clínico");
        var encounter=repository.createEncounter(a.patientId(),a.doctorId(),a.id(),users.currentUserId());
        audit.record("ENCOUNTER_STARTED","ENCOUNTER",encounter.id());
        return encounter;
    }

    @Transactional
    public ClinicalRepository.Encounter saveDraft(UUID id,String chief,String assessment,String plan,int version){
        var result=repository.saveDraft(id,chief,assessment,plan,version);
        audit.record("ENCOUNTER_DRAFT_SAVED","ENCOUNTER",id); return result;
    }

    @Transactional
    public ClinicalRepository.Encounter finalizeEncounter(UUID id,int version){
        var current=repository.getEncounter(id);
        if(current.assessment()==null||current.assessment().isBlank()) throw new BusinessRuleException("Avaliação clínica é obrigatória para finalizar.");
        var result=repository.finalizeEncounter(id,version);
        appointments.transition(current.appointmentId(),AppointmentStatus.COMPLETED,"Atendimento finalizado");
        audit.record("ENCOUNTER_FINALIZED","ENCOUNTER",id); return result;
    }

    public ClinicalRepository.Addendum addAddendum(UUID id,String reason,String content){
        var result=repository.addAddendum(id,users.currentUserId(),reason,content);
        audit.record("ENCOUNTER_ADDENDUM_CREATED","ENCOUNTER",id); return result;
    }

    public ClinicalRepository.Allergy addAllergy(UUID patientId,String substance,String reaction,String severity){
        var result=repository.createAllergy(patientId,substance,reaction,severity,users.currentUserId());
        audit.record("ALLERGY_CREATED","PATIENT",patientId); return result;
    }
}
