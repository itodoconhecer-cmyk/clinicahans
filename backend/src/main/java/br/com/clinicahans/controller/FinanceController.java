package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import br.com.clinicahans.UseCase.FinanceUseCase;
import br.com.clinicahans.repository.FinanceRepository;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
@PreAuthorize("hasAnyRole('RECEPCAO','GESTAO','ADMIN')")
public class FinanceController {
    private final FinanceUseCase service;
    public FinanceController(FinanceUseCase service){this.service=service;}

    @PostMapping("/receivables")
    public FinanceRepository.Receivable create(@Valid @RequestBody ReceivableRequest r){return service.create(r.encounterId(),r.payerType(),r.payerReference(),r.amount(),r.dueDate());}

    @PostMapping("/receivables/{id}/payments")
    public FinanceRepository.Payment pay(@PathVariable UUID id,@Valid @RequestBody PaymentRequest r){return service.pay(id,r.amount(),r.method());}

    @GetMapping("/receivables")
    public List<FinanceRepository.Receivable> list(@RequestParam LocalDate from,@RequestParam LocalDate to,@RequestParam(defaultValue="100") int limit){return service.list(from,to,limit);}

    
    
}
