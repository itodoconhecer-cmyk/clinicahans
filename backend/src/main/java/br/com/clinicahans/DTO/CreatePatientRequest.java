package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePatientRequest(@NotBlank @Size(max=180) String fullName,
        @Pattern(regexp="^$|\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$") String cpf,
        @NotNull @Past LocalDate birthDate, @Size(max=30) String phone, @Email @Size(max=180) String email) {}
