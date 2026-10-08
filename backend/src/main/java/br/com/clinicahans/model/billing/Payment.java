package br.com.clinicahans.model.billing;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record Payment(UUID id, UUID receivableId, BigDecimal amount, String method, OffsetDateTime paidAt) {}
