package br.com.clinicahans.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateUserRequest(
    @NotBlank @Size(max = 120) String username,
    @NotBlank @Size(min = 12, max = 200) String password,
    @NotEmpty List<@NotBlank @Size(max = 40) String> roles
) {}
