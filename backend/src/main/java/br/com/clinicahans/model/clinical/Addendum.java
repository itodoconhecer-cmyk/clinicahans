package br.com.clinicahans.model.clinical;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Addendum(UUID id, UUID encounterId, String reason, String content, OffsetDateTime createdAt) {}
