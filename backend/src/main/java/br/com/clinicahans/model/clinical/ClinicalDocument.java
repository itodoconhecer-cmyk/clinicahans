package br.com.clinicahans.model.clinical;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClinicalDocument(UUID id, UUID patientId, UUID encounterId, String documentType, String storageKey,
                               String mimeType, String checksum, OffsetDateTime createdAt) {}
