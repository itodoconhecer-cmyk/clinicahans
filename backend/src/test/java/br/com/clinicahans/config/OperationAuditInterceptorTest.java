package br.com.clinicahans.config;

import br.com.clinicahans.UseCase.AuditUseCase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OperationAuditInterceptorTest {
    private final AuditUseCase auditUseCase = mock(AuditUseCase.class);
    private final OperationAuditInterceptor interceptor = new OperationAuditInterceptor(auditUseCase);

    @AfterEach
    void clearSecurityContext() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void recordsRequestAndOnlyCapturesUuidPathVariables() throws Exception {
        var auditId = UUID.randomUUID();
        var patientId = UUID.randomUUID();
        when(auditUseCase.startRequestAudit("GET", "/api/v1/patients/{id}", "127.0.0.1",
            Map.of("id", patientId.toString()))).thenReturn(auditId);
        var request = new MockHttpServletRequest("GET", "/api/v1/patients/" + patientId);
        request.setRemoteAddr("127.0.0.1");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/patients/{id}");
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, Map.of(
            "id", patientId.toString(), "search", "patient-name"));
        var response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        response.setStatus(200);
        interceptor.afterCompletion(request, response, new Object(), null);

        verify(auditUseCase).startRequestAudit("GET", "/api/v1/patients/{id}", "127.0.0.1",
            Map.of("id", patientId.toString()));
        verify(auditUseCase).completeRequestAudit(eq(auditId), eq(200), anyLong());
    }
}
