package br.com.clinicahans.DTO;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A scheduled event shown for context while choosing an open appointment slot. */
public record AppointmentCalendarEventResponse(
    UUID doctorId,
    String doctorName,
    UUID specialtyId,
    String specialtyName,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    String status
) {}
