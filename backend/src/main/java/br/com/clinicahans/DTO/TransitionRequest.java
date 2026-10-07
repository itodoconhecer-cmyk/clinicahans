package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import br.com.clinicahans.model.scheduling.AppointmentStatus;

public record TransitionRequest(@NotNull AppointmentStatus target,@Size(max=250) String reason) {}
