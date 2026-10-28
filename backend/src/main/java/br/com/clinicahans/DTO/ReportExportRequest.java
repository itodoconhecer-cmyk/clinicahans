package br.com.clinicahans.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record ReportExportRequest(@NotNull UUID reportRunId,
                                  @NotBlank @Pattern(regexp="APPOINTMENTS|FINANCE") String type,
                                  @NotNull LocalDate from, @NotNull LocalDate to,
                                  @Size(max=20) String groupBy, @Size(max=120) String groupValue,
                                  @Min(0) @Max(10000) int page, @Min(1) @Max(100) int size,
                                  UUID doctorId, UUID specialtyId, @Size(max=20) String cohort) { }
