package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record AddendumRequest(@NotBlank @Size(max=1000) String reason,@NotBlank @Size(max=12000) String content) {}
