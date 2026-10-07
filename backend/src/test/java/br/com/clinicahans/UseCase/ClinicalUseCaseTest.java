package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.ClinicalRepository;

import br.com.clinicahans.repository.AppointmentRepository;
import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.AppointmentStatus;
import br.com.clinicahans.model.clinical.Encounter;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ClinicalUseCaseTest {
    private final ClinicalRepository repository=mock(ClinicalRepository.class);
    private final AppointmentUseCase appointmentUseCase=mock(AppointmentUseCase.class);
    private final UserIdentityService users=mock(UserIdentityService.class);
    private final AuditUseCase auditUseCase=mock(AuditUseCase.class);
    private final ClinicalUseCase clinicalUseCase=new ClinicalUseCase(repository,appointmentUseCase,users,auditUseCase);

    @Test
    void medicoNaoPodeIniciarAtendimentoDeOutroProfissional() {
        UUID appointmentId=UUID.randomUUID(), scheduledDoctor=UUID.randomUUID(), loggedDoctor=UUID.randomUUID();
        var now=OffsetDateTime.now();
        when(appointmentUseCase.get(appointmentId)).thenReturn(new Appointment(
            appointmentId,UUID.randomUUID(),scheduledDoctor,now,now.plusMinutes(30),"PRESENCIAL",
            AppointmentStatus.CHECKED_IN,null,null,null,now,now,now));
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(loggedDoctor);

        assertThrows(BusinessRuleException.class,()->clinicalUseCase.start(appointmentId));
        verify(repository,never()).createEncounter(any(),any(),any(),any());
    }

    @Test
    void atendimentoFinalizadoNaoPodeSerSalvoComoRascunhoPeloRepositorio() {
        UUID encounterId=UUID.randomUUID(), doctorId=UUID.randomUUID();
        var encounter=new Encounter(encounterId,UUID.randomUUID(),doctorId,UUID.randomUUID(),
            "dor","avaliacao","plano","FINAL",2,OffsetDateTime.now(),OffsetDateTime.now());
        when(repository.getEncounter(encounterId)).thenReturn(encounter);
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(doctorId);
        when(repository.saveDraft(encounterId,"x","y","z",2)).thenThrow(new BusinessRuleException("Atendimento não pode ser alterado."));

        assertThrows(BusinessRuleException.class,()->clinicalUseCase.saveDraft(encounterId,"x","y","z",2));
    }
}
