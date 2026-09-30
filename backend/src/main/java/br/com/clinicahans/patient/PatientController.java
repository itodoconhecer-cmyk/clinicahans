package br.com.clinicahans.patient;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {
    private final PatientService service;
    public PatientController(PatientService service) { this.service = service; }

    @PostMapping
    @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public PatientRepository.Patient create(@Valid @RequestBody CreatePatientRequest r) {
        return service.create(r.fullName(), r.cpf(), r.birthDate(), r.phone(), r.email());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public PatientRepository.Patient get(@PathVariable UUID id) { return service.get(id); }

    @GetMapping
    @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<PatientRepository.Patient> search(@RequestParam(defaultValue="") String q,
                                                  @RequestParam(defaultValue="30") int limit) {
        return service.search(q, limit);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public PatientRepository.Patient update(@PathVariable UUID id, @Valid @RequestBody UpdatePatientRequest r) {
        return service.update(id, r.fullName(), r.phone(), r.email(), r.version());
    }

    public record CreatePatientRequest(@NotBlank @Size(max=180) String fullName,
        @Pattern(regexp="^$|\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$") String cpf,
        @NotNull @Past LocalDate birthDate, @Size(max=30) String phone, @Email @Size(max=180) String email) {}
    public record UpdatePatientRequest(@NotBlank @Size(max=180) String fullName,
        @Size(max=30) String phone, @Email @Size(max=180) String email, @PositiveOrZero int version) {}
}
