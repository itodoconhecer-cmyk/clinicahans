package br.com.clinicahans.UseCase;

import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.clinicahans.repository.AuditRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.clinicahans.utilities.exception.NotFoundException;

import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class AuditUseCaseTest {
    private final AuditRepository repository = mock(AuditRepository.class);
    private final AuditUseCase auditUseCase = new AuditUseCase(repository, new ObjectMapper());

    @AfterEach
    void clearRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
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

    @Test
    void parentRunMustBelongToUserMatchFiltersAndContainTheRequestedRecord() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("gestor", "unused", java.util.List.of()));
        UUID parent = UUID.randomUUID(); UUID source = UUID.randomUUID();
        String path = "/api/v1/management/reports/sources";
        when(repository.successfulReportRequestContext(parent, "gestor", path)).thenReturn(
            "{\"type\":\"APPOINTMENTS\",\"sourceIds\":[\"" + source + "\"]}");
        assertDoesNotThrow(() -> auditUseCase.validateReportParent(parent, path,
            Map.of("type", "APPOINTMENTS", "sourceId", source.toString()), "type"));
        assertThrows(NotFoundException.class, () -> auditUseCase.validateReportParent(parent, path,
            Map.of("type", "APPOINTMENTS", "sourceId", UUID.randomUUID().toString()), "type"));
        assertThrows(IllegalArgumentException.class, () -> auditUseCase.validateReportParent(parent, path,
            Map.of("type", "FINANCE", "sourceId", source.toString()), "type"));
        assertThrows(NotFoundException.class, () -> auditUseCase.validateReportParent(UUID.randomUUID(), path,
            Map.of("type", "APPOINTMENTS"), "type"));
    }

    @Test
    void operationalDetailMustMatchTheSpecificOccurrenceInTheListing() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("gestor", "unused", java.util.List.of()));
        UUID parent = UUID.randomUUID(), source = UUID.randomUUID();
        String path = "/api/v1/management/operational-reports/sources";
        when(repository.successfulReportRequestContext(parent, "gestor", path)).thenReturn(
            "{\"type\":\"CAPACITY\",\"sourceIds\":[\"" + source + "\"],\"sourceKeys\":[\"" + source + "|2026-10-05\"]}");
        assertDoesNotThrow(() -> auditUseCase.validateReportParent(parent, path,
            Map.of("type", "CAPACITY", "sourceId", source.toString(), "sourceKey", source + "|2026-10-05"), "type"));
        assertThrows(NotFoundException.class, () -> auditUseCase.validateReportParent(parent, path,
            Map.of("type", "CAPACITY", "sourceId", source.toString(), "sourceKey", source + "|2026-10-12"), "type"));
    }
}
