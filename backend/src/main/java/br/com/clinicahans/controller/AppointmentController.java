package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.AppointmentUseCase;
import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.AppointmentStatus;

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
    private final AppointmentUseCase appointmentUseCase;
    public AppointmentController(AppointmentUseCase appointmentUseCase){this.appointmentUseCase=appointmentUseCase;}

    @PostMapping @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public Appointment create(@Valid @RequestBody CreateAppointmentRequest r){
        return appointmentUseCase.create(r.patientId(),r.doctorId(),r.startsAt(),r.durationMinutes(),r.modality(),r.notes());
    }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public Appointment get(@PathVariable UUID id){return appointmentUseCase.get(id);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','ADMIN')")
    public List<Appointment> list(@RequestParam OffsetDateTime from,@RequestParam OffsetDateTime to,@RequestParam(required=false) UUID doctorId){
        return appointmentUseCase.list(from,to,doctorId);
    }
    @PostMapping("/{id}/transition") @PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
    public Appointment transition(@PathVariable UUID id,@Valid @RequestBody TransitionRequest r){
        return appointmentUseCase.transition(id,r.target(),r.reason());
    }

    
    
}
