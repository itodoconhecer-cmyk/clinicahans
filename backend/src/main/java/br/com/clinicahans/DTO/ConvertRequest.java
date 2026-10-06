package br.com.clinicahans.DTO;

import br.com.clinicahans.appointment.AppointmentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ConvertRequest(UUID doctorId,@NotNull OffsetDateTime startsAt,Integer durationMinutes,@NotBlank String modality) {}
