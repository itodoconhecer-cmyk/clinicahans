package br.com.clinicahans.continuity;

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
    private final ContinuityService service;
    public ContinuityController(ContinuityService service){this.service=service;}

    @PostMapping("/exams") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public ContinuityRepository.ExamOrder exam(@Valid @RequestBody CreateExamRequest r){return service.createExam(r.encounterId(),r.examName(),r.priority(),r.expectedBy());}

    @PostMapping("/exams/{id}/result") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public ContinuityRepository.ExamResult result(@PathVariable UUID id,@Valid @RequestBody ResultRequest r){return service.receiveResult(id,r.storageKey(),r.mimeType());}

    @GetMapping("/exams/{id}/result") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public ContinuityRepository.ExamResult examResult(@PathVariable UUID id){return service.resultForOrder(id);}

    @PostMapping("/results/{id}/review") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public void review(@PathVariable UUID id,@RequestBody(required=false) ReviewRequest r){service.reviewResult(id,r==null?null:r.note());}

    @GetMapping("/exams/pending") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public List<ContinuityRepository.ExamOrder> pending(@RequestParam(defaultValue="50") int limit){return service.pendingExams(limit);}

    @PostMapping("/follow-ups") @PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
    public ContinuityRepository.FollowUp followUp(@Valid @RequestBody FollowUpRequest r){return service.createFollowUp(r.patientId(),r.encounterId(),r.reason(),r.priority(),r.dueAt());}

    @GetMapping("/follow-ups/operational") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<ContinuityRepository.OperationalFollowUp> queue(@RequestParam(defaultValue="50") int limit){return service.operationalQueue(limit);}

    @PostMapping("/follow-ups/{id}/actions") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public void action(@PathVariable UUID id,@Valid @RequestBody ActionRequest r){service.addAction(id,r.actionType(),r.note(),r.close());}

    public record CreateExamRequest(@NotNull UUID encounterId,@NotBlank @Size(max=220) String examName,
      @Pattern(regexp="ROUTINE|HIGH|URGENT") String priority,LocalDate expectedBy){}
    public record ResultRequest(@NotBlank @Size(max=500) String storageKey,@NotBlank @Size(max=120) String mimeType){}
    public record ReviewRequest(@Size(max=4000) String note){}
    public record FollowUpRequest(@NotNull UUID patientId,UUID encounterId,@NotBlank @Size(max=500) String reason,
      @Pattern(regexp="LOW|MEDIUM|HIGH|CRITICAL") String priority,OffsetDateTime dueAt){}
    public record ActionRequest(@NotBlank @Size(max=40) String actionType,@Size(max=1000) String note,boolean close){}
}
