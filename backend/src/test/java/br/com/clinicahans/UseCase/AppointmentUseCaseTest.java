package br.com.clinicahans.UseCase;

import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.AppointmentStatus;
import br.com.clinicahans.model.scheduling.Availability;
import br.com.clinicahans.model.workforce.Doctor;
import br.com.clinicahans.repository.AppointmentRepository;

import br.com.clinicahans.repository.DoctorRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class AppointmentUseCaseTest {
    private final AppointmentRepository repository=mock(AppointmentRepository.class);
    private final PatientRepository patients=mock(PatientRepository.class);
    private final DoctorRepository doctors=mock(DoctorRepository.class);
    private final UserIdentityService users=mock(UserIdentityService.class);
    private final AuditUseCase auditUseCase=mock(AuditUseCase.class);
    private final AppointmentUseCase appointmentUseCase=new AppointmentUseCase(repository,patients,doctors,users,auditUseCase,"America/Sao_Paulo");

    @Test
    void deveBloquearConflitoDeAgenda() {
        UUID patientId=UUID.randomUUID(), doctorId=UUID.randomUUID();
        var start=OffsetDateTime.now().plusDays(1).withSecond(0).withNano(0);
        when(doctors.get(doctorId)).thenReturn(new Doctor(
            doctorId,"Dr. Hans",null,"12345","SP",null,null,null,"ACTIVE",30,"PRESENCIAL",null));
        when(doctors.availability(doctorId)).thenReturn(java.util.List.of(
            new Availability(UUID.randomUUID(),start.atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo")).getDayOfWeek().getValue(),
                java.time.LocalTime.MIN,java.time.LocalTime.of(23,59),30,true)));
        when(repository.hasConflict(eq(doctorId),eq(start),any())).thenReturn(true);

        assertThrows(BusinessRuleException.class,
            ()->appointmentUseCase.create(patientId,doctorId,start,30,"PRESENCIAL",null));
        verify(repository,never()).create(any(),any(),any(),any(),any(),any(),any());
    }

    @Test
    void naoDevePermitirTransicaoDeCanceladoParaAtendimento() {
        UUID id=UUID.randomUUID();
        var now=OffsetDateTime.now();
        when(repository.get(id)).thenReturn(new Appointment(
            id,UUID.randomUUID(),UUID.randomUUID(),now,now.plusMinutes(30),"PRESENCIAL",
            AppointmentStatus.CANCELLED,null,"Paciente cancelou",null,null,now,now));

        assertThrows(BusinessRuleException.class,
            ()->appointmentUseCase.transition(id,AppointmentStatus.IN_CARE,null));
        verify(repository,never()).changeStatus(any(),any(),any(),any());
    }
}
