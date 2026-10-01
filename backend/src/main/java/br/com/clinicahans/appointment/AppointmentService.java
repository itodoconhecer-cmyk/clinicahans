package br.com.clinicahans.appointment;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.doctor.DoctorRepository;
import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.patient.PatientRepository;
import br.com.clinicahans.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AppointmentService {
    private final AppointmentRepository repository; private final PatientRepository patients; private final DoctorRepository doctors;
    private final UserIdentityService users; private final AuditService audit;
    private static final Map<AppointmentStatus, EnumSet<AppointmentStatus>> TRANSITIONS=Map.of(
      AppointmentStatus.SCHEDULED,EnumSet.of(AppointmentStatus.CONFIRMED,AppointmentStatus.CHECKED_IN,AppointmentStatus.CANCELLED,AppointmentStatus.NO_SHOW),
      AppointmentStatus.CONFIRMED,EnumSet.of(AppointmentStatus.CHECKED_IN,AppointmentStatus.CANCELLED,AppointmentStatus.NO_SHOW),
      AppointmentStatus.CHECKED_IN,EnumSet.of(AppointmentStatus.IN_CARE,AppointmentStatus.CANCELLED),
      AppointmentStatus.IN_CARE,EnumSet.of(AppointmentStatus.COMPLETED),
      AppointmentStatus.COMPLETED,EnumSet.noneOf(AppointmentStatus.class),
      AppointmentStatus.CANCELLED,EnumSet.noneOf(AppointmentStatus.class),
      AppointmentStatus.NO_SHOW,EnumSet.noneOf(AppointmentStatus.class));

    public AppointmentService(AppointmentRepository repository,PatientRepository patients,DoctorRepository doctors,UserIdentityService users,AuditService audit){
        this.repository=repository;this.patients=patients;this.doctors=doctors;this.users=users;this.audit=audit;
    }

    @Transactional
    public AppointmentRepository.Appointment create(UUID patientId,UUID doctorId,OffsetDateTime start,Integer durationMinutes,String modality,String notes){
        patients.get(patientId); var doctor=doctors.get(doctorId);
        if(start.isBefore(OffsetDateTime.now())) throw new BusinessRuleException("Não é permitido criar novo agendamento no passado.");
        if(!"ACTIVE".equals(doctor.status())) throw new BusinessRuleException("Médico não está ativo para novos agendamentos.");
        int minutes=durationMinutes==null?doctor.defaultAppointmentMinutes():durationMinutes;
        if(minutes<5 || minutes>480) throw new BusinessRuleException("Duração do agendamento inválida.");
        OffsetDateTime end=start.plusMinutes(minutes);
        boolean insideAvailability=doctors.availability(doctorId).stream().anyMatch(v ->
            v.active() && v.weekday()==start.getDayOfWeek().getValue()
            && !start.toLocalTime().isBefore(v.startsAt()) && !end.toLocalTime().isAfter(v.endsAt()));
        if(!insideAvailability) throw new BusinessRuleException("Horário está fora da disponibilidade configurada do médico.");
        if(repository.hasScheduleBlock(doctorId,start,end)) throw new BusinessRuleException("Horário está bloqueado na agenda do médico.");
        if(repository.hasConflict(doctorId,start,end)) throw new BusinessRuleException("Horário conflita com outro agendamento do médico.");
        var a=repository.create(patientId,doctorId,start,end,modality,notes,users.currentUserId());
        audit.record("APPOINTMENT_CREATED","APPOINTMENT",a.id());
        return repository.get(a.id());
    }

    public AppointmentRepository.Appointment get(UUID id){return repository.get(id);}
    public List<AppointmentRepository.Appointment> list(OffsetDateTime from,OffsetDateTime to,UUID doctorId){
        if(!to.isAfter(from) || Duration.between(from,to).toDays()>93) throw new BusinessRuleException("Intervalo de consulta inválido.");
        return repository.list(from,to,doctorId);
    }

    @Transactional
    public AppointmentRepository.Appointment transition(UUID id,AppointmentStatus target,String reason){
        var current=repository.get(id);
        if(!TRANSITIONS.get(current.status()).contains(target)) throw new BusinessRuleException("Transição de agenda inválida: "+current.status()+" -> "+target);
        if(target==AppointmentStatus.CANCELLED && (reason==null||reason.isBlank())) throw new BusinessRuleException("Cancelamento exige motivo.");
        repository.changeStatus(id,target,reason,users.currentUserId());
        audit.record("APPOINTMENT_"+target.name(),"APPOINTMENT",id);
        return repository.get(id);
    }
}
