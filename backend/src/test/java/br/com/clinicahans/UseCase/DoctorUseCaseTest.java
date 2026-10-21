package br.com.clinicahans.UseCase;

import br.com.clinicahans.model.scheduling.Availability;
import br.com.clinicahans.model.workforce.Doctor;
import br.com.clinicahans.repository.DoctorRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DoctorUseCaseTest {
    private final DoctorRepository repository = mock(DoctorRepository.class);
    private final AuditUseCase audit = mock(AuditUseCase.class);
    private final DoctorUseCase useCase = new DoctorUseCase(repository, audit);

    @Test
    void createsAvailabilityAndRecordsAudit() {
        UUID doctorId = UUID.randomUUID();
        when(repository.get(doctorId)).thenReturn(doctor(doctorId));

        useCase.addAvailability(doctorId, 2, LocalTime.of(13, 0), LocalTime.of(17, 0), 30);

        verify(repository).addAvailability(doctorId, 2, LocalTime.of(13, 0), LocalTime.of(17, 0), 30);
        verify(audit).record("DOCTOR_AVAILABILITY_CREATED", "DOCTOR", doctorId);
    }

    @Test
    void rejectsAvailabilityWithEndBeforeOrEqualToStart() {
        UUID doctorId = UUID.randomUUID();
        when(repository.get(doctorId)).thenReturn(doctor(doctorId));

        assertThrows(BusinessRuleException.class,
            () -> useCase.addAvailability(doctorId, 2, LocalTime.of(17, 0), LocalTime.of(13, 0), 30));
        assertThrows(BusinessRuleException.class,
            () -> useCase.addAvailability(doctorId, 2, LocalTime.of(13, 0), LocalTime.of(13, 0), 30));

        verify(repository, never()).addAvailability(doctorId, 2, LocalTime.of(17, 0), LocalTime.of(13, 0), 30);
    }

    @Test
    void rejectsScheduleBlockWithEndBeforeOrEqualToStart() {
        UUID doctorId = UUID.randomUUID();
        var start = java.time.OffsetDateTime.now().plusDays(1);

        assertThrows(BusinessRuleException.class,
            () -> useCase.addScheduleBlock(doctorId, start, start, "Teste"));
        assertThrows(BusinessRuleException.class,
            () -> useCase.addScheduleBlock(doctorId, start, start.minusMinutes(1), "Teste"));

        verify(repository, never()).addScheduleBlock(doctorId, start, start, "Teste");
    }

    private Doctor doctor(UUID id) {
        return new Doctor(id, "Dr. Teste", null, "12345", "SP", null,
            null, null, "ACTIVE", 30, "PRESENCIAL", null);
    }
}
