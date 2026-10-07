package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.ContinuityUseCase;
import br.com.clinicahans.repository.ContinuityRepository;
import br.com.clinicahans.model.continuity.ExamOrder;
import br.com.clinicahans.model.continuity.ExamResult;
import br.com.clinicahans.model.continuity.FollowUp;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/continuity")
public class ContinuityController {
    private final ContinuityUseCase continuityUseCase;
    public ContinuityController(ContinuityUseCase continuityUseCase){this.continuityUseCase=continuityUseCase;}

    @PostMapping("/exams") @PreAuthorize("hasRole('MEDICO')")
    public ExamOrder exam(@Valid @RequestBody CreateExamRequest r){return continuityUseCase.createExam(r.encounterId(),r.examName(),r.priority(),r.expectedBy());}

    @PostMapping("/exams/{id}/result") @PreAuthorize("hasRole('MEDICO')")
    public ExamResult result(@PathVariable UUID id,@Valid @RequestBody ResultRequest r){return continuityUseCase.receiveResult(id,r.storageKey(),r.mimeType());}

    @GetMapping("/exams/{id}/result") @PreAuthorize("hasRole('MEDICO')")
    public ExamResult examResult(@PathVariable UUID id){return continuityUseCase.resultForOrder(id);}

    @PostMapping("/results/{id}/review") @PreAuthorize("hasRole('MEDICO')")
    public void review(@PathVariable UUID id,@RequestBody(required=false) ReviewRequest r){continuityUseCase.reviewResult(id,r==null?null:r.note());}

    @GetMapping("/exams/pending") @PreAuthorize("hasRole('MEDICO')")
    public List<ExamOrder> pending(@RequestParam(defaultValue="50") int limit){return continuityUseCase.pendingExams(limit);}

    @PostMapping("/follow-ups") @PreAuthorize("hasRole('MEDICO')")
    public FollowUp followUp(@Valid @RequestBody FollowUpRequest r){return continuityUseCase.createFollowUp(r.patientId(),r.encounterId(),r.reason(),r.priority(),r.dueAt());}

    @GetMapping("/follow-ups/operational") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<ContinuityRepository.OperationalFollowUp> queue(@RequestParam(defaultValue="50") int limit){return continuityUseCase.operationalQueue(limit);}

    @PostMapping("/follow-ups/{id}/actions") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public void action(@PathVariable UUID id,@Valid @RequestBody ActionRequest r){continuityUseCase.addAction(id,r.actionType(),r.note(),r.close());}

    
    
    
    
    
}
