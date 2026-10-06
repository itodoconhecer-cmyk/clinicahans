package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.ContinuityUseCase;
import br.com.clinicahans.repository.ContinuityRepository;

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
    private final ContinuityUseCase service;
    public ContinuityController(ContinuityUseCase service){this.service=service;}

    @PostMapping("/exams") @PreAuthorize("hasRole('MEDICO')")
    public ContinuityRepository.ExamOrder exam(@Valid @RequestBody CreateExamRequest r){return service.createExam(r.encounterId(),r.examName(),r.priority(),r.expectedBy());}

    @PostMapping("/exams/{id}/result") @PreAuthorize("hasRole('MEDICO')")
    public ContinuityRepository.ExamResult result(@PathVariable UUID id,@Valid @RequestBody ResultRequest r){return service.receiveResult(id,r.storageKey(),r.mimeType());}

    @GetMapping("/exams/{id}/result") @PreAuthorize("hasRole('MEDICO')")
    public ContinuityRepository.ExamResult examResult(@PathVariable UUID id){return service.resultForOrder(id);}

    @PostMapping("/results/{id}/review") @PreAuthorize("hasRole('MEDICO')")
    public void review(@PathVariable UUID id,@RequestBody(required=false) ReviewRequest r){service.reviewResult(id,r==null?null:r.note());}

    @GetMapping("/exams/pending") @PreAuthorize("hasRole('MEDICO')")
    public List<ContinuityRepository.ExamOrder> pending(@RequestParam(defaultValue="50") int limit){return service.pendingExams(limit);}

    @PostMapping("/follow-ups") @PreAuthorize("hasRole('MEDICO')")
    public ContinuityRepository.FollowUp followUp(@Valid @RequestBody FollowUpRequest r){return service.createFollowUp(r.patientId(),r.encounterId(),r.reason(),r.priority(),r.dueAt());}

    @GetMapping("/follow-ups/operational") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<ContinuityRepository.OperationalFollowUp> queue(@RequestParam(defaultValue="50") int limit){return service.operationalQueue(limit);}

    @PostMapping("/follow-ups/{id}/actions") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public void action(@PathVariable UUID id,@Valid @RequestBody ActionRequest r){service.addAction(id,r.actionType(),r.note(),r.close());}

    
    
    
    
    
}
