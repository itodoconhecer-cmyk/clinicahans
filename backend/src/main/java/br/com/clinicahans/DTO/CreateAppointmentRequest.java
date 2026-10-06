package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateAppointmentRequest(@NotNull UUID patientId,@NotNull UUID doctorId,@NotNull OffsetDateTime startsAt,
      Integer durationMinutes,@NotNull String modality,@Size(max=500) String notes) {}
