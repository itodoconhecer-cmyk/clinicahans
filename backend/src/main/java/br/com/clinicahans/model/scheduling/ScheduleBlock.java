package br.com.clinicahans.model.scheduling;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ScheduleBlock(UUID id, OffsetDateTime startsAt, OffsetDateTime endsAt, String reason) {}
