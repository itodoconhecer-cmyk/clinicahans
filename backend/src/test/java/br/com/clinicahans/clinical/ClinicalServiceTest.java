package br.com.clinicahans.clinical;

import br.com.clinicahans.appointment.AppointmentRepository;
import br.com.clinicahans.appointment.AppointmentService;
import br.com.clinicahans.appointment.AppointmentStatus;
import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.security.UserIdentityService;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ClinicalServiceTest {
    private final ClinicalRepository repository=mock(ClinicalRepository.class);
    private final AppointmentService appointments=mock(AppointmentService.class);
    private final UserIdentityService users=mock(UserIdentityService.class);
    private final AuditService audit=mock(AuditService.class);
    private final ClinicalService service=new ClinicalService(repository,appointments,users,audit);

    @Test
    void medicoNaoPodeIniciarAtendimentoDeOutroProfissional() {
        UUID appointmentId=UUID.randomUUID(), scheduledDoctor=UUID.randomUUID(), loggedDoctor=UUID.randomUUID();
        var now=OffsetDateTime.now();
        when(appointments.get(appointmentId)).thenReturn(new AppointmentRepository.Appointment(
            appointmentId,UUID.randomUUID(),scheduledDoctor,now,now.plusMinutes(30),"PRESENCIAL",
            AppointmentStatus.CHECKED_IN,null,null,null,now,now,now));
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(loggedDoctor);

        assertThrows(BusinessRuleException.class,()->service.start(appointmentId));
        verify(repository,never()).createEncounter(any(),any(),any(),any());
    }

    @Test
    void atendimentoFinalizadoNaoPodeSerSalvoComoRascunhoPeloRepositorio() {
        UUID encounterId=UUID.randomUUID(), doctorId=UUID.randomUUID();
        var encounter=new ClinicalRepository.Encounter(encounterId,UUID.randomUUID(),doctorId,UUID.randomUUID(),
            "dor","avaliacao","plano","FINAL",2,OffsetDateTime.now(),OffsetDateTime.now());
        when(repository.getEncounter(encounterId)).thenReturn(encounter);
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(doctorId);
        when(repository.saveDraft(encounterId,"x","y","z",2)).thenThrow(new BusinessRuleException("Atendimento não pode ser alterado."));

        assertThrows(BusinessRuleException.class,()->service.saveDraft(encounterId,"x","y","z",2));
    }
}
