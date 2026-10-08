package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.DoctorRepository;
import br.com.clinicahans.model.workforce.Doctor;
import br.com.clinicahans.model.workforce.Specialty;
import br.com.clinicahans.model.scheduling.ScheduleBlock;
import br.com.clinicahans.model.scheduling.Availability;

import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorUseCase {
    private final DoctorRepository repository; private final AuditUseCase auditUseCase;
    public DoctorUseCase(DoctorRepository repository, AuditUseCase auditUseCase){this.repository=repository;this.auditUseCase=auditUseCase;}

    @Transactional
    public Doctor create(String name,String cpf,String crm,String state,String rqe,String phone,String email,
                                           String status,int minutes,String modality){
        if(minutes < 5 || minutes > 480) throw new BusinessRuleException("Duração padrão inválida.");
        var d=repository.create(name.trim(),cpf,crm.trim(),state,rqe,phone,email,status,minutes,modality);
        auditUseCase.record("DOCTOR_CREATED","DOCTOR",d.id()); return d;
    }
    public Doctor get(UUID id){return repository.get(id);}
    public List<Doctor> search(String q,int limit){return repository.search(q,limit);}
    @Transactional
    public Specialty createSpecialty(String name,String system,String code){
        var specialty=repository.createSpecialty(name.trim(),system,code);
        auditUseCase.record("SPECIALTY_CREATED","SPECIALTY",specialty.id());
        return specialty;
    }
    public List<Specialty> specialties(){return repository.listSpecialties();}
    @Transactional
    public void linkSpecialty(UUID doctorId,UUID specialtyId,boolean primary){
        repository.linkSpecialty(doctorId,specialtyId,primary);
        auditUseCase.record("DOCTOR_SPECIALTY_LINKED","DOCTOR",doctorId);
    }
    @Transactional
    public void addScheduleBlock(UUID doctorId,java.time.OffsetDateTime start,java.time.OffsetDateTime end,String reason){
        if(!end.isAfter(start)) throw new BusinessRuleException("Fim do bloqueio deve ser posterior ao início.");
        repository.addScheduleBlock(doctorId,start,end,reason);
        auditUseCase.record("DOCTOR_SCHEDULE_BLOCK_CREATED","DOCTOR",doctorId);
    }
    public List<ScheduleBlock> scheduleBlocks(UUID doctorId,java.time.OffsetDateTime from,java.time.OffsetDateTime to){
        repository.get(doctorId); return repository.scheduleBlocks(doctorId,from,to);
    }

    @Transactional
    public void linkUser(UUID doctorId, UUID userId) {
        repository.linkUser(doctorId,userId);
        auditUseCase.record("DOCTOR_USER_LINKED","DOCTOR",doctorId);
    }
    public List<Availability> availability(UUID id){repository.get(id);return repository.availability(id);}
    @Transactional
    public void addAvailability(UUID id,int weekday, LocalTime start,LocalTime end,int slot){
        repository.get(id);
        if(!end.isAfter(start)) throw new BusinessRuleException("Fim da disponibilidade deve ser posterior ao início.");
        repository.addAvailability(id,weekday,start,end,slot); auditUseCase.record("DOCTOR_AVAILABILITY_CREATED","DOCTOR",id);
    }
}
