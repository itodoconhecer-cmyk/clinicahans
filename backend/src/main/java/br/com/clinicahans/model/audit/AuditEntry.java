package br.com.clinicahans.model.audit;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditEntry(UUID id, String username, String action, String entityType, String entityId,
                         String correlationId, OffsetDateTime occurredAt, String sourceIp,
                         String requestMethod, String requestPath, Integer httpStatus, Long durationMs,
                         String outcome, String resourceIdentifiers, String previousValues) {}
