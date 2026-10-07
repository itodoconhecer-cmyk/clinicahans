package br.com.clinicahans.model.scheduling;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WaitlistEntry(UUID id, UUID patientId, UUID doctorId, UUID specialtyId, OffsetDateTime preferredFrom,
                    OffsetDateTime preferredTo, String status, int priority, OffsetDateTime createdAt,
                    OffsetDateTime resolvedAt) {}
