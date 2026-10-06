package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record SpecialtyRequest(@NotBlank @Size(max=120) String name,@Size(max=40) String externalSystem,@Size(max=80) String externalCode) {}
