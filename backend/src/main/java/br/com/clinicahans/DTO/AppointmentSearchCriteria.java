package br.com.clinicahans.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentSearchCriteria(
    String doctor,
    String specialty,
    Integer weekday,
    String period,
    LocalDate date,
    LocalTime time
) {}
