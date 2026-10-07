package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.DoctorUseCase;
import br.com.clinicahans.model.workforce.Doctor;
import br.com.clinicahans.model.workforce.Specialty;
import br.com.clinicahans.model.scheduling.ScheduleBlock;
import br.com.clinicahans.model.scheduling.Availability;

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
    private final DoctorUseCase doctorUseCase;
    public DoctorController(DoctorUseCase doctorUseCase){this.doctorUseCase=doctorUseCase;}

    @PostMapping @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public Doctor create(@Valid @RequestBody CreateDoctorRequest r){
        return doctorUseCase.create(r.fullName(),r.cpf(),r.crm(),r.crmState(),r.rqe(),r.phone(),r.email(),r.status(),r.defaultAppointmentMinutes(),r.modality());
    }
    @GetMapping("/{id}") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public Doctor get(@PathVariable UUID id){return doctorUseCase.get(id);}
    @GetMapping @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<Doctor> search(@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="30") int limit){return doctorUseCase.search(q,limit);}
    @PostMapping("/specialties") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public Specialty createSpecialty(@Valid @RequestBody SpecialtyRequest r){return doctorUseCase.createSpecialty(r.name(),r.externalSystem(),r.externalCode());}
    @GetMapping("/specialties") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<Specialty> specialties(){return doctorUseCase.specialties();}
    @PostMapping("/{id}/specialties/{specialtyId}") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void linkSpecialty(@PathVariable UUID id,@PathVariable UUID specialtyId,@RequestParam(defaultValue="false") boolean primary){doctorUseCase.linkSpecialty(id,specialtyId,primary);}
    @PostMapping("/{id}/blocks") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void addBlock(@PathVariable UUID id,@Valid @RequestBody ScheduleBlockRequest r){doctorUseCase.addScheduleBlock(id,r.startsAt(),r.endsAt(),r.reason());}
    @GetMapping("/{id}/blocks") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<ScheduleBlock> blocks(@PathVariable UUID id,@RequestParam java.time.OffsetDateTime from,@RequestParam java.time.OffsetDateTime to){return doctorUseCase.scheduleBlocks(id,from,to);}

    @PostMapping("/{id}/user-link") @PreAuthorize("hasRole('ADMIN')")
    public void linkUser(@PathVariable UUID id,@Valid @RequestBody UserLinkRequest r){doctorUseCase.linkUser(id,r.userId());}
    @GetMapping("/{id}/availability") @PreAuthorize("hasAnyRole('RECEPCAO','MEDICO','GESTAO','ADMIN')")
    public List<Availability> availability(@PathVariable UUID id){return doctorUseCase.availability(id);}
    @PostMapping("/{id}/availability") @PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
    public void addAvailability(@PathVariable UUID id,@Valid @RequestBody AvailabilityRequest r){doctorUseCase.addAvailability(id,r.weekday(),r.startsAt(),r.endsAt(),r.slotMinutes());}

    
    
    
    
    
}
