package br.com.clinicahans.DTO;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AppointmentSlotResponse(
    UUID doctorId,
    String doctorName,
    UUID specialtyId,
    String specialtyName,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    String status
) {}
