package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ReceivableRequest(@NotNull UUID encounterId,@Pattern(regexp="PRIVATE|INSURANCE") String payerType,
      @Size(max=120) String payerReference,@NotNull @DecimalMin("0.00") BigDecimal amount,LocalDate dueDate) {}
