package br.com.clinicahans.model.audit;

import java.time.OffsetDateTime;

public record PublicOperationRecord(OffsetDateTime occurredAt, String method, String route,
                                    Integer status, Long durationMs) {}
