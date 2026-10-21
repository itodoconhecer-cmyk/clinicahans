package br.com.clinicahans.DTO;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A scheduled event shown for context while choosing an open appointment slot. */
public record AppointmentCalendarEventResponse(
    UUID appointmentId,
    UUID doctorId,
    String doctorName,
    UUID specialtyId,
    String specialtyName,
    String maskedPatientName,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    String status
) {}
