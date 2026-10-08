package br.com.clinicahans.model.patient;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record Patient(UUID id, String fullName, String cpf, LocalDate birthDate, String phone, String email,
                      String status, OffsetDateTime createdAt, OffsetDateTime updatedAt, int version) {}
