package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.WaitlistUseCase;
import br.com.clinicahans.repository.AppointmentRepository;
import br.com.clinicahans.repository.WaitlistRepository;

import br.com.clinicahans.appointment.AppointmentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/waitlist")
@PreAuthorize("hasAnyRole('RECEPCAO','ADMIN')")
public class WaitlistController {
    private final WaitlistUseCase service;
    public WaitlistController(WaitlistUseCase service){this.service=service;}

    @PostMapping
    public WaitlistRepository.Entry create(@Valid @RequestBody CreateRequest r){
        return service.create(r.patientId(),r.doctorId(),r.specialtyId(),r.preferredFrom(),r.preferredTo(),r.priority());
    }
    @GetMapping
    public List<WaitlistRepository.Entry> waiting(@RequestParam(required=false) UUID doctorId,@RequestParam(required=false) UUID specialtyId,
                                                   @RequestParam(defaultValue="50") int limit){
        return service.waiting(doctorId,specialtyId,limit);
    }
    @PostMapping("/{id}/convert")
    public AppointmentRepository.Appointment convert(@PathVariable UUID id,@Valid @RequestBody ConvertRequest r){
        return service.convertToAppointment(id,r.doctorId(),r.startsAt(),r.durationMinutes(),r.modality());
    }

    
    
}
