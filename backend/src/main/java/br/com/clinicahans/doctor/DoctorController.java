package br.com.clinicahans.doctor;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
public class DoctorController {
    private final DoctorService service;
    public DoctorController(DoctorService service){this.service=service;}

    @PostMapping @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public DoctorRepository.Doctor create(@Valid @RequestBody CreateDoctorRequest r){
        return service.create(r.fullName(),r.cpf(),r.crm(),r.crmState(),r.rqe(),r.phone(),r.email(),r.status(),r.defaultAppointmentMinutes(),r.modality());
    }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public DoctorRepository.Doctor get(@PathVariable UUID id){return service.get(id);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.Doctor> search(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="30") int limit){return service.search(q,limit);}
    @GetMapping("/{id}/availability") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.Availability> availability(@PathVariable UUID id){return service.availability(id);}
    @PostMapping("/{id}/availability") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void addAvailability(@PathVariable UUID id,@Valid @RequestBody AvailabilityRequest r){service.addAvailability(id,r.weekday(),r.startsAt(),r.endsAt(),r.slotMinutes());}

    public record CreateDoctorRequest(@NotBlank @Size(max=180) String fullName,String cpf,@NotBlank String crm,
      @NotBlank @Pattern(regexp="[A-Za-z]{2}") String crmState,String rqe,String phone,@Email String email,
      @Pattern(regexp="ACTIVE|INACTIVE|AWAY") String status,@Min(5) @Max(480) int defaultAppointmentMinutes,
      @Pattern(regexp="PRESENCIAL|TELEMEDICINA|HIBRIDO") String modality){}
    public record AvailabilityRequest(@Min(1) @Max(7) int weekday,@NotNull LocalTime startsAt,@NotNull LocalTime endsAt,@Min(5) @Max(480) int slotMinutes){}
}
