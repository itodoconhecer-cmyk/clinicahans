package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record DocumentRequest(UUID encounterId,@NotBlank @Size(max=50) String documentType,@NotBlank @Size(max=500) String storageKey,@NotBlank @Size(max=120) String mimeType,@Size(max=128) String checksum) {}
