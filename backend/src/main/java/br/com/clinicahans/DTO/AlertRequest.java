package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record AlertRequest(@NotBlank @Size(max=40) String type,@Pattern(regexp="LOW|MEDIUM|HIGH|CRITICAL") String severity,@NotBlank @Size(max=300) String message) {}
