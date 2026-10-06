package br.com.clinicahans.DTO;

import br.com.clinicahans.appointment.AppointmentRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateRequest(@NotNull UUID patientId,UUID doctorId,UUID specialtyId,OffsetDateTime preferredFrom,
                                OffsetDateTime preferredTo,@Min(0) @Max(100) int priority) {}
