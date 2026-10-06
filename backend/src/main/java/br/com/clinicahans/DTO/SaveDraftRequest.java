package br.com.clinicahans.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

public record SaveDraftRequest(@Size(max=4000) String chiefComplaint,@Size(max=12000) String assessment,@Size(max=12000) String plan,@PositiveOrZero int version) {}
