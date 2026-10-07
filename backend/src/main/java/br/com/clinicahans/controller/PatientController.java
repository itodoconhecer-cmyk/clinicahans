package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.CreatePatientRequest;
import br.com.clinicahans.DTO.PatientResponse;
import br.com.clinicahans.DTO.UpdatePatientRequest;
import br.com.clinicahans.UseCase.PatientUseCase;
import br.com.clinicahans.mapper.PatientRequestMapper;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {
    private final PatientUseCase patientUseCase;
    public PatientController(PatientUseCase patientUseCase) { this.patientUseCase = patientUseCase; }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public PatientResponse create(@Valid @RequestBody CreatePatientRequest request) {
        return PatientRequestMapper.toResponse(patientUseCase.create(PatientRequestMapper.toCommand(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public PatientResponse get(@PathVariable UUID id) {
        return PatientRequestMapper.toResponse(patientUseCase.get(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<PatientResponse> search(@RequestParam(defaultValue="") String q,
                                        @RequestParam(defaultValue="30") int limit) {
        return patientUseCase.search(q, limit).stream().map(PatientRequestMapper::toResponse).toList();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public PatientResponse update(@PathVariable UUID id, @Valid @RequestBody UpdatePatientRequest request) {
        return PatientRequestMapper.toResponse(patientUseCase.update(id, PatientRequestMapper.toCommand(request)));
    }
}
