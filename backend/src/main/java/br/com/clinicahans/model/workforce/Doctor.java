package br.com.clinicahans.model.workforce;

import java.util.UUID;

public record Doctor(UUID id, String fullName, String cpf, String crm, String crmState, String rqe, String phone,
                     String email, String status, int defaultAppointmentMinutes, String modality, UUID userId) {}
