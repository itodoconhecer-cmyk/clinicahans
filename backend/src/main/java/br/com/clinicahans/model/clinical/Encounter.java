package br.com.clinicahans.model.clinical;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Encounter(UUID id, UUID patientId, UUID doctorId, UUID appointmentId, String chiefComplaint,
                        String assessment, String plan, String status, int version, OffsetDateTime startedAt,
                        OffsetDateTime completedAt) {}
