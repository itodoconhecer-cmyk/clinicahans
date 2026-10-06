package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record CreateUserRequest(@NotBlank @Size(max=120) String username,@NotBlank @Size(min=12,max=200) String password,List<String> roles) {}
