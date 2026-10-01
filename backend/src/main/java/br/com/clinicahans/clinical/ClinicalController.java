package br.com.clinicahans.clinical;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinical")
@PreAuthorize("hasAnyRole('MEDICO','ADMIN')")
public class ClinicalController {
    private final ClinicalService service;
    public ClinicalController(ClinicalService service){this.service=service;}

    @GetMapping("/patients/{patientId}/safety-snapshot")
    public ClinicalRepository.SafetySnapshot safetySnapshot(@PathVariable UUID patientId){return service.safetySnapshot(patientId);}

    @GetMapping("/patients/{patientId}/timeline")
    public List<ClinicalRepository.TimelineEvent> timeline(@PathVariable UUID patientId,@RequestParam(defaultValue="50") int limit){return service.timeline(patientId,limit);}

    @PostMapping("/encounters/start")
    public ClinicalRepository.Encounter start(@Valid @RequestBody StartEncounterRequest r){return service.start(r.appointmentId());}

    @PutMapping("/encounters/{id}/draft")
    public ClinicalRepository.Encounter saveDraft(@PathVariable UUID id,@Valid @RequestBody SaveDraftRequest r){
        return service.saveDraft(id,r.chiefComplaint(),r.assessment(),r.plan(),r.version());
    }

    @PostMapping("/encounters/{id}/finalize")
    public ClinicalRepository.Encounter finalizeEncounter(@PathVariable UUID id,@Valid @RequestBody VersionRequest r){return service.finalizeEncounter(id,r.version());}

    @PostMapping("/encounters/{id}/addenda")
    public ClinicalRepository.Addendum addendum(@PathVariable UUID id,@Valid @RequestBody AddendumRequest r){return service.addAddendum(id,r.reason(),r.content());}

    @PostMapping("/patients/{patientId}/allergies")
    public ClinicalRepository.Allergy allergy(@PathVariable UUID patientId,@Valid @RequestBody AllergyRequest r){
        return service.addAllergy(patientId,r.substance(),r.reaction(),r.severity());
    }

    public record StartEncounterRequest(@NotNull UUID appointmentId){}
    public record SaveDraftRequest(@Size(max=4000) String chiefComplaint,@Size(max=12000) String assessment,@Size(max=12000) String plan,@PositiveOrZero int version){}
    public record VersionRequest(@PositiveOrZero int version){}
    public record AddendumRequest(@NotBlank @Size(max=1000) String reason,@NotBlank @Size(max=12000) String content){}
    public record AllergyRequest(@NotBlank @Size(max=180) String substance,@Size(max=2000) String reaction,
      @Pattern(regexp="LOW|MEDIUM|HIGH|CRITICAL") String severity){}
}
