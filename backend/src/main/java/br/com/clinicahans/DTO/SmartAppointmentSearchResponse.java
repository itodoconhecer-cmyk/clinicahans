package br.com.clinicahans.DTO;

import java.util.List;

public record SmartAppointmentSearchResponse(
    AppointmentSearchCriteria criteria,
    List<AppointmentSlotResponse> slots,
    String message
) {}
