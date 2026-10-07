package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.ContinuityRepository;

import br.com.clinicahans.repository.ClinicalRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.model.continuity.ExamOrder;
import br.com.clinicahans.model.clinical.Encounter;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ContinuityUseCaseTest {
    private final ContinuityRepository repository=mock(ContinuityRepository.class);
    private final ClinicalRepository clinical=mock(ClinicalRepository.class);
    private final PatientRepository patients=mock(PatientRepository.class);
    private final UserIdentityService users=mock(UserIdentityService.class);
    private final AuditUseCase auditUseCase=mock(AuditUseCase.class);
    private final ContinuityUseCase continuityUseCase=new ContinuityUseCase(repository,clinical,patients,users,auditUseCase);

    @Test
    void medicoNaoPodeReceberResultadoDeExameDeOutroMedico() {
        UUID orderId=UUID.randomUUID(), encounterId=UUID.randomUUID();
        UUID patientId=UUID.randomUUID(), ownerDoctor=UUID.randomUUID(), loggedDoctor=UUID.randomUUID();
        when(repository.getExam(orderId)).thenReturn(new ExamOrder(
            orderId,patientId,encounterId,"Hemograma","ROUTINE","REQUESTED",null,OffsetDateTime.now()));
        when(clinical.getEncounter(encounterId)).thenReturn(new Encounter(
            encounterId,patientId,ownerDoctor,UUID.randomUUID(),null,null,null,"DRAFT",0,OffsetDateTime.now(),null));
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(loggedDoctor);

        assertThrows(BusinessRuleException.class,
            ()->continuityUseCase.receiveResult(orderId,"results/x.pdf","application/pdf"));
        verify(repository,never()).receiveResult(any(),any(),any());
    }

    @Test
    void listaDeExamesDoMedicoDeveSerEscopadaAoMedicoLogado() {
        UUID doctorId=UUID.randomUUID();
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(doctorId);
        when(repository.pendingExamsForDoctor(doctorId,50)).thenReturn(List.of());

        continuityUseCase.pendingExams(50);

        verify(repository).pendingExamsForDoctor(doctorId,50);
        verify(repository,never()).pendingExams(anyInt());
    }
}
