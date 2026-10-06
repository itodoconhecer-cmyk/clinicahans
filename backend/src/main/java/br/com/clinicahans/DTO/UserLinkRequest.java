package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record UserLinkRequest(@NotNull UUID userId) {}
