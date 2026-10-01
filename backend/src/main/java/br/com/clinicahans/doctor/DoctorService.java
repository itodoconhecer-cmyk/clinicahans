package br.com.clinicahans.doctor;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorService {
    private final DoctorRepository repository; private final AuditService audit;
    public DoctorService(DoctorRepository repository, AuditService audit){this.repository=repository;this.audit=audit;}

    public DoctorRepository.Doctor create(String name,String cpf,String crm,String state,String rqe,String phone,String email,
                                           String status,int minutes,String modality){
        if(minutes < 5 || minutes > 480) throw new BusinessRuleException("Duração padrão inválida.");
        var d=repository.create(name.trim(),cpf,crm.trim(),state,rqe,phone,email,status,minutes,modality);
        audit.record("DOCTOR_CREATED","DOCTOR",d.id()); return d;
    }
    public DoctorRepository.Doctor get(UUID id){return repository.get(id);}
    public List<DoctorRepository.Doctor> search(String q,int limit){return repository.search(q,limit);}
    public void linkUser(UUID doctorId, UUID userId) {
        repository.linkUser(doctorId,userId);
        audit.record("DOCTOR_USER_LINKED","DOCTOR",doctorId);
    }
    public List<DoctorRepository.Availability> availability(UUID id){repository.get(id);return repository.availability(id);}
    public void addAvailability(UUID id,int weekday, LocalTime start,LocalTime end,int slot){
        repository.get(id);
        if(!end.isAfter(start)) throw new BusinessRuleException("Fim da disponibilidade deve ser posterior ao início.");
        repository.addAvailability(id,weekday,start,end,slot); audit.record("DOCTOR_AVAILABILITY_CREATED","DOCTOR",id);
    }
}
