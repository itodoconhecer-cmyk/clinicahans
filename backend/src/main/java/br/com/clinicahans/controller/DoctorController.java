package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.DoctorUseCase;
import br.com.clinicahans.repository.DoctorRepository;

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
    private final DoctorUseCase service;
    public DoctorController(DoctorUseCase service){this.service=service;}

    @PostMapping @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public DoctorRepository.Doctor create(@Valid @RequestBody CreateDoctorRequest r){
        return service.create(r.fullName(),r.cpf(),r.crm(),r.crmState(),r.rqe(),r.phone(),r.email(),r.status(),r.defaultAppointmentMinutes(),r.modality());
    }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public DoctorRepository.Doctor get(@PathVariable UUID id){return service.get(id);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.Doctor> search(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="30") int limit){return service.search(q,limit);}
    @PostMapping("/specialties") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public DoctorRepository.Specialty createSpecialty(@Valid @RequestBody SpecialtyRequest r){return service.createSpecialty(r.name(),r.externalSystem(),r.externalCode());}
    @GetMapping("/specialties") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.Specialty> specialties(){return service.specialties();}
    @PostMapping("/{id}/specialties/{specialtyId}") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void linkSpecialty(@PathVariable UUID id,@PathVariable UUID specialtyId,@RequestParam(defaultValue="false") boolean primary){service.linkSpecialty(id,specialtyId,primary);}
    @PostMapping("/{id}/blocks") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void addBlock(@PathVariable UUID id,@Valid @RequestBody ScheduleBlockRequest r){service.addScheduleBlock(id,r.startsAt(),r.endsAt(),r.reason());}
    @GetMapping("/{id}/blocks") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.ScheduleBlock> blocks(@PathVariable UUID id,@RequestParam java.time.OffsetDateTime from,@RequestParam java.time.OffsetDateTime to){return service.scheduleBlocks(id,from,to);}

    @PostMapping("/{id}/user-link") @PreAuthorize("hasRole('ADMIN')")
    public void linkUser(@PathVariable UUID id,@Valid @RequestBody UserLinkRequest r){service.linkUser(id,r.userId());}
    @GetMapping("/{id}/availability") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<DoctorRepository.Availability> availability(@PathVariable UUID id){return service.availability(id);}
    @PostMapping("/{id}/availability") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void addAvailability(@PathVariable UUID id,@Valid @RequestBody AvailabilityRequest r){service.addAvailability(id,r.weekday(),r.startsAt(),r.endsAt(),r.slotMinutes());}

    
    
    
    
    
}
