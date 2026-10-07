package br.com.clinicahans.controller;

import br.com.clinicahans.UseCase.ManagementQueryUseCase;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/management")
@PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
public class ManagementController {
    private final ManagementQueryUseCase managementQueryUseCase;
    public ManagementController(ManagementQueryUseCase managementQueryUseCase){this.managementQueryUseCase=managementQueryUseCase;}

    @GetMapping("/dashboard")
    public ManagementQueryUseCase.Dashboard dashboard(@RequestParam LocalDate from,@RequestParam LocalDate to){
        return managementQueryUseCase.dashboard(from,to);
    }
}
