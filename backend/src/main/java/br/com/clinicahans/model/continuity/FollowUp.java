package br.com.clinicahans.model.continuity;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FollowUp(UUID id, UUID patientId, UUID encounterId, UUID ownerUserId, String reason, String priority,
                       String status, OffsetDateTime dueAt, OffsetDateTime createdAt, OffsetDateTime closedAt) {}
