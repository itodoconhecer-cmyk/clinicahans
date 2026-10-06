package br.com.clinicahans.controller;

import br.com.clinicahans.UseCase.ManagementQueryUseCase;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/management")
@PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
public class ManagementController {
    private final ManagementQueryUseCase service;
    public ManagementController(ManagementQueryUseCase service){this.service=service;}

    @GetMapping("/dashboard")
    public ManagementQueryUseCase.Dashboard dashboard(@RequestParam LocalDate from,@RequestParam LocalDate to){
        return service.dashboard(from,to);
    }
}
