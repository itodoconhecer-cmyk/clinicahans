package br.com.clinicahans.continuity;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.clinical.ClinicalRepository;
import br.com.clinicahans.patient.PatientRepository;
import br.com.clinicahans.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ContinuityService {
    private final ContinuityRepository repository; private final ClinicalRepository clinical; private final PatientRepository patients;
    private final UserIdentityService users; private final AuditService audit;
    public ContinuityService(ContinuityRepository repository,ClinicalRepository clinical,PatientRepository patients,UserIdentityService users,AuditService audit){
        this.repository=repository;this.clinical=clinical;this.patients=patients;this.users=users;this.audit=audit;
    }

    public ContinuityRepository.ExamOrder createExam(UUID encounterId,String name,String priority,LocalDate expectedBy){
        var e=clinical.getEncounter(encounterId);
        var result=repository.createExam(e.patientId(),encounterId,users.currentUserId(),name,priority,expectedBy);
        audit.record("EXAM_ORDER_CREATED","EXAM_ORDER",result.id()); return result;
    }
    public ContinuityRepository.ExamResult receiveResult(UUID orderId,String storageKey,String mimeType){
        var result=repository.receiveResult(orderId,storageKey,mimeType);
        audit.record("EXAM_RESULT_RECEIVED","EXAM_ORDER",orderId); return result;
    }
    public void reviewResult(UUID resultId,String note){
        repository.reviewResult(resultId,users.currentUserId(),note); audit.record("EXAM_RESULT_REVIEWED","EXAM_RESULT",resultId);
    }

    public ContinuityRepository.FollowUp createFollowUp(UUID patientId,UUID encounterId,String reason,String priority,OffsetDateTime dueAt){
        patients.get(patientId);
        if(encounterId!=null && !clinical.getEncounter(encounterId).patientId().equals(patientId))
            throw new br.com.clinicahans.exception.BusinessRuleException("Atendimento não pertence ao paciente informado.");
        var result=repository.createFollowUp(patientId,encounterId,users.currentUserId(),reason,priority,dueAt);
        audit.record("FOLLOW_UP_CREATED","FOLLOW_UP",result.id()); return result;
    }

    @Transactional
    public void addAction(UUID id,String actionType,String note,boolean close){
        repository.addAction(id,users.currentUserId(),actionType,note,close);
        audit.record(close?"FOLLOW_UP_CLOSED":"FOLLOW_UP_ACTION_ADDED","FOLLOW_UP",id);
    }

    public List<ContinuityRepository.OperationalFollowUp> operationalQueue(int limit){return repository.operationalQueue(limit);}
    public List<ContinuityRepository.ExamOrder> pendingExams(int limit){return repository.pendingExams(limit);}
}
