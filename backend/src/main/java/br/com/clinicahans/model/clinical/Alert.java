package br.com.clinicahans.model.clinical;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Alert(UUID id, String type, String severity, String message, OffsetDateTime createdAt) {}
