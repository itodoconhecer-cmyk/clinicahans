package br.com.clinicahans.management;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/management")
@PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
public class ManagementController {
    private final ManagementQueryService service;
    public ManagementController(ManagementQueryService service){this.service=service;}

    @GetMapping("/dashboard")
    public ManagementQueryService.Dashboard dashboard(@RequestParam LocalDate from,@RequestParam LocalDate to){
        return service.dashboard(from,to);
    }
}
