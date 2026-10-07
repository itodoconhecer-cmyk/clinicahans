package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.WaitlistRepository;
import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.WaitlistEntry;

import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class WaitlistUseCase {
    private final WaitlistRepository repository; private final AppointmentUseCase appointmentUseCase; private final PatientRepository patients;
    private final UserIdentityService users; private final AuditUseCase auditUseCase;
    public WaitlistUseCase(WaitlistRepository repository,AppointmentUseCase appointmentUseCase,PatientRepository patients,UserIdentityService users,AuditUseCase auditUseCase){
        this.repository=repository;this.appointmentUseCase=appointmentUseCase;this.patients=patients;this.users=users;this.auditUseCase=auditUseCase;
    }

    @Transactional
    public WaitlistEntry create(UUID patientId,UUID doctorId,UUID specialtyId,OffsetDateTime from,OffsetDateTime to,int priority){
        patients.get(patientId);
        if(doctorId==null&&specialtyId==null) throw new BusinessRuleException("Fila de espera exige médico ou especialidade.");
        var waitlistEntry=repository.create(patientId,doctorId,specialtyId,from,to,priority,users.currentUserId());
        auditUseCase.record("WAITLIST_CREATED","WAITLIST",waitlistEntry.id()); return waitlistEntry;
    }
    public List<WaitlistEntry> waiting(UUID doctorId,UUID specialtyId,int limit){return repository.waiting(doctorId,specialtyId,limit);}

    @Transactional
    public Appointment convertToAppointment(UUID waitlistId,UUID doctorId,OffsetDateTime startsAt,Integer duration,String modality){
        var entry=repository.get(waitlistId);
        UUID selectedDoctor=doctorId!=null?doctorId:entry.doctorId();
        if(selectedDoctor==null) throw new BusinessRuleException("É necessário selecionar um médico para converter a fila em agendamento.");
        if(entry.preferredFrom()!=null&&startsAt.isBefore(entry.preferredFrom())) throw new BusinessRuleException("Horário anterior à preferência registrada.");
        if(entry.preferredTo()!=null&&startsAt.isAfter(entry.preferredTo())) throw new BusinessRuleException("Horário posterior à preferência registrada.");
        var appointment=appointmentUseCase.create(entry.patientId(),selectedDoctor,startsAt,duration,modality,"Originado da fila de espera "+waitlistId);
        repository.resolve(waitlistId);
        auditUseCase.record("WAITLIST_RESOLVED","WAITLIST",waitlistId);
        return appointment;
    }
}
