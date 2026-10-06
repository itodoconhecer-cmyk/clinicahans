package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record AllergyRequest(@NotBlank @Size(max=180) String substance,@Size(max=2000) String reaction,
      @Pattern(regexp="LOW|MEDIUM|HIGH|CRITICAL") String severity) {}
