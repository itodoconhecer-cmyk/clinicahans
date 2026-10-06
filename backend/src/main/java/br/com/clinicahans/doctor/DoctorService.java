package br.com.clinicahans.doctor;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorService {
    private final DoctorRepository repository; private final AuditService audit;
    public DoctorService(DoctorRepository repository, AuditService audit){this.repository=repository;this.audit=audit;}

    @Transactional
    public DoctorRepository.Doctor create(String name,String cpf,String crm,String state,String rqe,String phone,String email,
                                           String status,int minutes,String modality){
        if(minutes < 5 || minutes > 480) throw new BusinessRuleException("Duração padrão inválida.");
        var d=repository.create(name.trim(),cpf,crm.trim(),state,rqe,phone,email,status,minutes,modality);
        audit.record("DOCTOR_CREATED","DOCTOR",d.id()); return d;
    }
    public DoctorRepository.Doctor get(UUID id){return repository.get(id);}
    public List<DoctorRepository.Doctor> search(String q,int limit){return repository.search(q,limit);}
    @Transactional
    public DoctorRepository.Specialty createSpecialty(String name,String system,String code){
        var specialty=repository.createSpecialty(name.trim(),system,code);
        audit.record("SPECIALTY_CREATED","SPECIALTY",specialty.id());
        return specialty;
    }
    public List<DoctorRepository.Specialty> specialties(){return repository.listSpecialties();}
    @Transactional
    public void linkSpecialty(UUID doctorId,UUID specialtyId,boolean primary){
        repository.linkSpecialty(doctorId,specialtyId,primary);
        audit.record("DOCTOR_SPECIALTY_LINKED","DOCTOR",doctorId);
    }
    @Transactional
    public void addScheduleBlock(UUID doctorId,java.time.OffsetDateTime start,java.time.OffsetDateTime end,String reason){
        if(!end.isAfter(start)) throw new BusinessRuleException("Fim do bloqueio deve ser posterior ao início.");
        repository.addScheduleBlock(doctorId,start,end,reason);
        audit.record("DOCTOR_SCHEDULE_BLOCK_CREATED","DOCTOR",doctorId);
    }
    public List<DoctorRepository.ScheduleBlock> scheduleBlocks(UUID doctorId,java.time.OffsetDateTime from,java.time.OffsetDateTime to){
        repository.get(doctorId); return repository.scheduleBlocks(doctorId,from,to);
    }

    @Transactional
    public void linkUser(UUID doctorId, UUID userId) {
        repository.linkUser(doctorId,userId);
        audit.record("DOCTOR_USER_LINKED","DOCTOR",doctorId);
    }
    public List<DoctorRepository.Availability> availability(UUID id){repository.get(id);return repository.availability(id);}
    @Transactional
    public void addAvailability(UUID id,int weekday, LocalTime start,LocalTime end,int slot){
        repository.get(id);
        if(!end.isAfter(start)) throw new BusinessRuleException("Fim da disponibilidade deve ser posterior ao início.");
        repository.addAvailability(id,weekday,start,end,slot); audit.record("DOCTOR_AVAILABILITY_CREATED","DOCTOR",id);
    }
}
