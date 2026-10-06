package br.com.clinicahans.continuity;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.clinical.ClinicalRepository;
import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.patient.PatientRepository;
import br.com.clinicahans.security.UserIdentityService;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ContinuityServiceTest {
    private final ContinuityRepository repository=mock(ContinuityRepository.class);
    private final ClinicalRepository clinical=mock(ClinicalRepository.class);
    private final PatientRepository patients=mock(PatientRepository.class);
    private final UserIdentityService users=mock(UserIdentityService.class);
    private final AuditService audit=mock(AuditService.class);
    private final ContinuityService service=new ContinuityService(repository,clinical,patients,users,audit);

    @Test
    void medicoNaoPodeReceberResultadoDeExameDeOutroMedico() {
        UUID orderId=UUID.randomUUID(), encounterId=UUID.randomUUID();
        UUID patientId=UUID.randomUUID(), ownerDoctor=UUID.randomUUID(), loggedDoctor=UUID.randomUUID();
        when(repository.getExam(orderId)).thenReturn(new ContinuityRepository.ExamOrder(
            orderId,patientId,encounterId,"Hemograma","ROUTINE","REQUESTED",null,OffsetDateTime.now()));
        when(clinical.getEncounter(encounterId)).thenReturn(new ClinicalRepository.Encounter(
            encounterId,patientId,ownerDoctor,UUID.randomUUID(),null,null,null,"DRAFT",0,OffsetDateTime.now(),null));
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(loggedDoctor);

        assertThrows(BusinessRuleException.class,
            ()->service.receiveResult(orderId,"results/x.pdf","application/pdf"));
        verify(repository,never()).receiveResult(any(),any(),any());
    }

    @Test
    void listaDeExamesDoMedicoDeveSerEscopadaAoMedicoLogado() {
        UUID doctorId=UUID.randomUUID();
        when(users.currentUserHasRole("ADMIN")).thenReturn(false);
        when(users.currentDoctorId()).thenReturn(doctorId);
        when(repository.pendingExamsForDoctor(doctorId,50)).thenReturn(List.of());

        service.pendingExams(50);

        verify(repository).pendingExamsForDoctor(doctorId,50);
        verify(repository,never()).pendingExams(anyInt());
    }
}
