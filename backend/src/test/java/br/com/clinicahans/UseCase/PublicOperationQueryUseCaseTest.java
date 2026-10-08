package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.PublicOperationView;
import br.com.clinicahans.model.audit.PublicOperationRecord;
import br.com.clinicahans.repository.AuditRepository;
import org.junit.jupiter.api.Test;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

class PublicOperationQueryUseCaseTest {
    private final AuditRepository repository = mock(AuditRepository.class);
    private final PublicOperationQueryUseCase useCase = new PublicOperationQueryUseCase(repository);

    @Test
    void publicViewOnlyContainsSanitizedFieldsAndCapsResults() {
        var occurredAt = OffsetDateTime.parse("2026-10-07T10:00:00Z");
        when(repository.recentOperations(100)).thenReturn(List.of(
            new PublicOperationRecord(occurredAt, "GET", "/api/v1/patients/{id}", 200, 12L)));

        var result = useCase.recent(500);

        assertEquals(new PublicOperationView(occurredAt, "GET", "/api/v1/patients/{id}", 200, 12L), result.getFirst());
        var components = java.util.Arrays.stream(PublicOperationView.class.getRecordComponents())
            .map(java.lang.reflect.RecordComponent::getName).toList();
        assertEquals(List.of("occurredAt", "method", "route", "status", "durationMs"), components);
        verify(repository).recentOperations(100);
    }
}
