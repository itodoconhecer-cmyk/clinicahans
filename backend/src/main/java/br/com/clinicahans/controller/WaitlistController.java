package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.WaitlistUseCase;
import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.WaitlistEntry;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/waitlist")
@PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
public class WaitlistController {
    private final WaitlistUseCase waitlistUseCase;
    public WaitlistController(WaitlistUseCase waitlistUseCase){this.waitlistUseCase=waitlistUseCase;}

    @PostMapping
    public WaitlistEntry create(@Valid @RequestBody CreateRequest r){
        return waitlistUseCase.create(r.patientId(),r.doctorId(),r.specialtyId(),r.preferredFrom(),r.preferredTo(),r.priority());
    }
    @GetMapping
    public List<WaitlistEntry> waiting(
        @RequestParam(required = false) UUID doctorId,
        @RequestParam(required = false) UUID specialtyId,
        @RequestParam(defaultValue = "50") int limit) {
        return waitlistUseCase.waiting(doctorId,specialtyId,limit);
    }
    @PostMapping("/{id}/convert")
    public Appointment convert(@PathVariable UUID id,@Valid @RequestBody ConvertRequest r){
        return waitlistUseCase.convertToAppointment(id,r.doctorId(),r.startsAt(),r.durationMinutes(),r.modality());
    }

    
    
}
