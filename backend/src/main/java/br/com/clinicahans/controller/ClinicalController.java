package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.ClinicalUseCase;
import br.com.clinicahans.repository.ClinicalRepository;
import br.com.clinicahans.model.clinical.Addendum;
import br.com.clinicahans.model.clinical.Alert;
import br.com.clinicahans.model.clinical.Allergy;
import br.com.clinicahans.model.clinical.ClinicalDocument;
import br.com.clinicahans.model.clinical.Condition;
import br.com.clinicahans.model.clinical.Encounter;
import br.com.clinicahans.model.clinical.Medication;

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
    private final ClinicalUseCase clinicalUseCase;
    public ClinicalController(ClinicalUseCase clinicalUseCase){this.clinicalUseCase=clinicalUseCase;}

    @GetMapping("/patients/{patientId}/safety-snapshot")
    public ClinicalRepository.SafetySnapshot safetySnapshot(@PathVariable UUID patientId){return clinicalUseCase.safetySnapshot(patientId);}

    @GetMapping("/patients/{patientId}/timeline")
    public List<ClinicalRepository.TimelineEvent> timeline(@PathVariable UUID patientId,@RequestParam(defaultValue="50") int limit){return clinicalUseCase.timeline(patientId,limit);}

    @PostMapping("/encounters/start")
    public Encounter start(@Valid @RequestBody StartEncounterRequest r){return clinicalUseCase.start(r.appointmentId());}

    @PutMapping("/encounters/{id}/draft")
    public Encounter saveDraft(@PathVariable UUID id,@Valid @RequestBody SaveDraftRequest r){
        return clinicalUseCase.saveDraft(id,r.chiefComplaint(),r.assessment(),r.plan(),r.version());
    }

    @PostMapping("/encounters/{id}/finalize")
    public Encounter finalizeEncounter(@PathVariable UUID id,@Valid @RequestBody VersionRequest r){return clinicalUseCase.finalizeEncounter(id,r.version());}

    @PostMapping("/encounters/{id}/addenda")
    public Addendum addendum(@PathVariable UUID id,@Valid @RequestBody AddendumRequest r){return clinicalUseCase.addAddendum(id,r.reason(),r.content());}

    @PostMapping("/patients/{patientId}/medications")
    public Medication medication(@PathVariable UUID patientId,@Valid @RequestBody MedicationRequest r){
        return clinicalUseCase.addMedication(patientId,r.name(),r.dosage(),r.frequency(),r.startedOn());
    }

    @PostMapping("/patients/{patientId}/conditions")
    public Condition condition(@PathVariable UUID patientId,@Valid @RequestBody ConditionRequest r){
        return clinicalUseCase.addCondition(patientId,r.description(),r.status(),r.onsetDate());
    }

    @PostMapping("/patients/{patientId}/alerts")
    public Alert alert(@PathVariable UUID patientId,@Valid @RequestBody AlertRequest r){
        return clinicalUseCase.addAlert(patientId,r.type(),r.severity(),r.message());
    }

    @DeleteMapping("/patients/{patientId}/alerts/{alertId}")
    public void deactivateAlert(@PathVariable UUID patientId,@PathVariable UUID alertId){clinicalUseCase.deactivateAlert(patientId,alertId);}

    @PostMapping("/patients/{patientId}/documents")
    public ClinicalDocument document(@PathVariable UUID patientId,@Valid @RequestBody DocumentRequest r){
        return clinicalUseCase.addDocument(patientId,r.encounterId(),r.documentType(),r.storageKey(),r.mimeType(),r.checksum());
    }

    @GetMapping("/patients/{patientId}/documents")
    public List<ClinicalDocument> documents(@PathVariable UUID patientId){return clinicalUseCase.documents(patientId);}

    @PostMapping("/patients/{patientId}/allergies")
    public Allergy allergy(@PathVariable UUID patientId,@Valid @RequestBody AllergyRequest r){
        return clinicalUseCase.addAllergy(patientId,r.substance(),r.reaction(),r.severity());
    }

    
    
    
    
    
    
    
    
    
}
