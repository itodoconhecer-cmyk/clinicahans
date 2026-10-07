package br.com.clinicahans.model.continuity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ExamOrder(UUID id, UUID patientId, UUID encounterId, String examName, String priority, String status,
                        LocalDate expectedBy, OffsetDateTime createdAt) {}
