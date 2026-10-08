package br.com.clinicahans.model.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record Receivable(UUID id, UUID encounterId, String payerType, String payerReference, BigDecimal amount,
                         LocalDate dueDate, String status, OffsetDateTime createdAt) {}
