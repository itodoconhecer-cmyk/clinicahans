package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record CreateDoctorRequest(@NotBlank @Size(max=180) String fullName,String cpf,@NotBlank String crm,
      @NotBlank @Pattern(regexp="[A-Za-z]{2}") String crmState,String rqe,String phone,@Email String email,
      @Pattern(regexp="ACTIVE|INACTIVE|AWAY") String status,@Min(5) @Max(480) int defaultAppointmentMinutes,
      @Pattern(regexp="PRESENCIAL|TELEMEDICINA|HIBRIDO") String modality) {}
