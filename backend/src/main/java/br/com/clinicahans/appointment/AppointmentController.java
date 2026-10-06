package br.com.clinicahans.appointment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
public class AppointmentController {
    private final AppointmentService service;
    public AppointmentController(AppointmentService service){this.service=service;}

    @PostMapping @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public AppointmentRepository.Appointment create(@Valid @RequestBody CreateAppointmentRequest r){
        return service.create(r.patientId(),r.doctorId(),r.startsAt(),r.durationMinutes(),r.modality(),r.notes());
    }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public AppointmentRepository.Appointment get(@PathVariable UUID id){return service.get(id);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<AppointmentRepository.Appointment> list(@RequestParam OffsetDateTime from,@RequestParam OffsetDateTime to,@RequestParam(required=false) UUID doctorId){
        return service.list(from,to,doctorId);
    }
    @PostMapping("/{id}/transition") @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public AppointmentRepository.Appointment transition(@PathVariable UUID id,@Valid @RequestBody TransitionRequest r){
        return service.transition(id,r.target(),r.reason());
    }

    public record CreateAppointmentRequest(@NotNull UUID patientId,@NotNull UUID doctorId,@NotNull OffsetDateTime startsAt,
      Integer durationMinutes,@NotNull String modality,@Size(max=500) String notes){}
    public record TransitionRequest(@NotNull AppointmentStatus target,@Size(max=250) String reason){}
}
