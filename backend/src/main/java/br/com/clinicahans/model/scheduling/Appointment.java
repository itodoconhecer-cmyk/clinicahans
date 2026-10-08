package br.com.clinicahans.model.scheduling;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Appointment(UUID id, UUID patientId, UUID doctorId, OffsetDateTime startsAt, OffsetDateTime endsAt,
                          String modality, AppointmentStatus status, String notes, String cancellationReason,
                          OffsetDateTime confirmedAt, OffsetDateTime checkedInAt, OffsetDateTime createdAt,
                          OffsetDateTime updatedAt) {}
