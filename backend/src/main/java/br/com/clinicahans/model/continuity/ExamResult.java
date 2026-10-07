package br.com.clinicahans.model.continuity;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ExamResult(UUID id, UUID examOrderId, String storageKey, String mimeType, OffsetDateTime receivedAt) {}
