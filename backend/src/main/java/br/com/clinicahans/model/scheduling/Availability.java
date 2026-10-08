package br.com.clinicahans.model.scheduling;

import java.time.LocalTime;
import java.util.UUID;

public record Availability(UUID id, int weekday, LocalTime startsAt, LocalTime endsAt, int slotMinutes,
                           boolean active) {}
