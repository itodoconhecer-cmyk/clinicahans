package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.ContinuityRepository;
import br.com.clinicahans.model.continuity.ExamOrder;
import br.com.clinicahans.model.continuity.ExamResult;
import br.com.clinicahans.model.continuity.FollowUp;
import br.com.clinicahans.repository.ContinuityRepository.OperationalFollowUp;
import br.com.clinicahans.model.clinical.Encounter;
import br.com.clinicahans.utilities.exception.BusinessRuleException;

import br.com.clinicahans.repository.ClinicalRepository;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ContinuityUseCase {
    private final ContinuityRepository repository; private final ClinicalRepository clinical; private final PatientRepository patients;
    private final UserIdentityService users; private final AuditUseCase auditUseCase;
    public ContinuityUseCase(ContinuityRepository repository,ClinicalRepository clinical,PatientRepository patients,UserIdentityService users,AuditUseCase auditUseCase){
        this.repository=repository;this.clinical=clinical;this.patients=patients;this.users=users;this.auditUseCase=auditUseCase;
    }

    @Transactional
    public ExamOrder createExam(UUID encounterId,String name,String priority,LocalDate expectedBy){
        var e=clinical.getEncounter(encounterId);
        assertDoctorOwnsEncounter(e);
        var result=repository.createExam(e.patientId(),encounterId,users.currentUserId(),name,priority,expectedBy);
        auditUseCase.record("EXAM_ORDER_CREATED","EXAM_ORDER",result.id()); return result;
    }
    @Transactional
    public ExamResult receiveResult(UUID orderId,String storageKey,String mimeType){
        assertExamAccess(repository.getExam(orderId));
        var result=repository.receiveResult(orderId,storageKey,mimeType);
        auditUseCase.record("EXAM_RESULT_RECEIVED","EXAM_ORDER",orderId); return result;
    }
    public ExamResult resultForOrder(UUID orderId){
        assertExamAccess(repository.getExam(orderId));
        return repository.findResultByOrder(orderId);
    }

    @Transactional
    public void reviewResult(UUID resultId,String note){
        assertExamAccess(repository.getExamByResult(resultId));
        repository.reviewResult(resultId,users.currentUserId(),note); auditUseCase.record("EXAM_RESULT_REVIEWED","EXAM_RESULT",resultId);
    }

    @Transactional
    public FollowUp createFollowUp(UUID patientId,UUID encounterId,String reason,String priority,OffsetDateTime dueAt){
        patients.get(patientId);
        if(encounterId!=null && !clinical.getEncounter(encounterId).patientId().equals(patientId))
            throw new br.com.clinicahans.utilities.exception.BusinessRuleException("Atendimento não pertence ao paciente informado.");
        var result=repository.createFollowUp(patientId,encounterId,users.currentUserId(),reason,priority,dueAt);
        auditUseCase.record("FOLLOW_UP_CREATED","FOLLOW_UP",result.id()); return result;
    }

    @Transactional
    public void addAction(UUID id,String actionType,String note,boolean close){
        assertFollowUpAccess(id);
        repository.addAction(id,users.currentUserId(),actionType,note,close);
        auditUseCase.record(close?"FOLLOW_UP_CLOSED":"FOLLOW_UP_ACTION_ADDED","FOLLOW_UP",id);
    }

    public List<OperationalFollowUp> operationalQueue(int limit){
        if(users.currentUserHasRole("MEDICO") && !users.currentUserHasRole("RECEPCAO") && !users.currentUserHasRole("ADMIN"))
            return repository.operationalQueueForDoctor(users.currentUserId(),users.currentDoctorId(),limit);
        return repository.operationalQueue(limit);
    }
    public List<ExamOrder> pendingExams(int limit){
        return users.currentUserHasRole("ADMIN") ? repository.pendingExams(limit) : repository.pendingExamsForDoctor(users.currentDoctorId(),limit);
    }

    private void assertFollowUpAccess(UUID followUpId){
        if(users.currentUserHasRole("MEDICO") && !users.currentUserHasRole("RECEPCAO") && !users.currentUserHasRole("ADMIN")
            && !repository.followUpAccessibleByDoctor(followUpId,users.currentUserId(),users.currentDoctorId()))
            throw new br.com.clinicahans.utilities.exception.BusinessRuleException("Médico não possui acesso a este acompanhamento.");
    }

    private void assertExamAccess(ExamOrder order){
        if(users.currentUserHasRole("ADMIN")) return;
        var encounter=clinical.getEncounter(order.encounterId());
        assertDoctorOwnsEncounter(encounter);
    }

    private void assertDoctorOwnsEncounter(Encounter encounter){
        if(!users.currentUserHasRole("ADMIN") && !users.currentDoctorId().equals(encounter.doctorId()))
            throw new br.com.clinicahans.utilities.exception.BusinessRuleException("Médico autenticado não é responsável por este atendimento/exame.");
    }
}
