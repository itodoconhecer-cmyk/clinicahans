package br.com.clinicahans.UseCase;

import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.clinicahans.repository.AuditRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

class AuditUseCaseTest {
    private final AuditRepository repository = mock(AuditRepository.class);
    private final AuditUseCase auditUseCase = new AuditUseCase(repository, new ObjectMapper());

    @AfterEach
    void clearRequestContext() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void storesPreviousValuesWithSensitiveClinicalContentRedacted() throws Exception {
        var request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        var id = UUID.randomUUID();

        auditUseCase.recordPreviousValues(Map.of("appointment.status", "SCHEDULED"));
        auditUseCase.recordPreviousValues(Map.of("encounter.clinicalContent", "[REDACTED]"));
        when(repository.completeRequest(id, 200, 18, "SUCCESS",
            "{\"appointment.status\":\"SCHEDULED\",\"encounter.clinicalContent\":\"[REDACTED]\"}")).thenReturn(1);
        auditUseCase.completeRequestAudit(id, 200, 18);

        verify(repository).completeRequest(id, 200, 18, "SUCCESS",
            "{\"appointment.status\":\"SCHEDULED\",\"encounter.clinicalContent\":\"[REDACTED]\"}");
    }
}
