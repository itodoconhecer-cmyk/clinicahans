package br.com.clinicahans.DTO;

import java.time.OffsetDateTime;

public record PublicOperationView(OffsetDateTime occurredAt, String method, String route,
                                  Integer status, Long durationMs) {}
