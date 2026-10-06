package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CreateExamRequest(@NotNull UUID encounterId,@NotBlank @Size(max=220) String examName,
      @Pattern(regexp="ROUTINE|HIGH|URGENT") String priority,LocalDate expectedBy) {}
