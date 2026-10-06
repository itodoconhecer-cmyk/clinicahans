package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.ClinicalUseCase;
import br.com.clinicahans.repository.ClinicalRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinical")
@PreAuthorize("hasRole('MEDICO')")
public class ClinicalController {
    private final ClinicalUseCase service;
    public ClinicalController(ClinicalUseCase service){this.service=service;}

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

    @PostMapping("/patients/{patientId}/medications")
    public ClinicalRepository.Medication medication(@PathVariable UUID patientId,@Valid @RequestBody MedicationRequest r){
        return service.addMedication(patientId,r.name(),r.dosage(),r.frequency(),r.startedOn());
    }

    @PostMapping("/patients/{patientId}/conditions")
    public ClinicalRepository.Condition condition(@PathVariable UUID patientId,@Valid @RequestBody ConditionRequest r){
        return service.addCondition(patientId,r.description(),r.status(),r.onsetDate());
    }

    @PostMapping("/patients/{patientId}/alerts")
    public ClinicalRepository.Alert alert(@PathVariable UUID patientId,@Valid @RequestBody AlertRequest r){
        return service.addAlert(patientId,r.type(),r.severity(),r.message());
    }

    @DeleteMapping("/patients/{patientId}/alerts/{alertId}")
    public void deactivateAlert(@PathVariable UUID patientId,@PathVariable UUID alertId){service.deactivateAlert(patientId,alertId);}

    @PostMapping("/patients/{patientId}/documents")
    public ClinicalRepository.ClinicalDocument document(@PathVariable UUID patientId,@Valid @RequestBody DocumentRequest r){
        return service.addDocument(patientId,r.encounterId(),r.documentType(),r.storageKey(),r.mimeType(),r.checksum());
    }

    @GetMapping("/patients/{patientId}/documents")
    public List<ClinicalRepository.ClinicalDocument> documents(@PathVariable UUID patientId){return service.documents(patientId);}

    @PostMapping("/patients/{patientId}/allergies")
    public ClinicalRepository.Allergy allergy(@PathVariable UUID patientId,@Valid @RequestBody AllergyRequest r){
        return service.addAllergy(patientId,r.substance(),r.reaction(),r.severity());
    }

    
    
    
    
    
    
    
    
    
}
