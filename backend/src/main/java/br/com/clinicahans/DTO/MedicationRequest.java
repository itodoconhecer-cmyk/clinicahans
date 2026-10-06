package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record MedicationRequest(@NotBlank @Size(max=180) String name,@Size(max=120) String dosage,@Size(max=120) String frequency,java.time.LocalDate startedOn) {}
