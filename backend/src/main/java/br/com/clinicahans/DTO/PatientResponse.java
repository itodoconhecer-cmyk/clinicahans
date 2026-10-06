package br.com.clinicahans.DTO;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PatientResponse(UUID id, String fullName, String cpf, LocalDate birthDate, String phone, String email,
                              String status, OffsetDateTime createdAt, OffsetDateTime updatedAt, int version) {}
