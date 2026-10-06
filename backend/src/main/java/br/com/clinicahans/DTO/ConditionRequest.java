package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record ConditionRequest(@NotBlank @Size(max=300) String description,@Pattern(regexp="ACTIVE|CONTROLLED|RESOLVED") String status,java.time.LocalDate onsetDate) {}
