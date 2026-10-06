package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record FollowUpRequest(@NotNull UUID patientId,UUID encounterId,@NotBlank @Size(max=500) String reason,
      @Pattern(regexp="LOW|MEDIUM|HIGH|CRITICAL") String priority,OffsetDateTime dueAt) {}
