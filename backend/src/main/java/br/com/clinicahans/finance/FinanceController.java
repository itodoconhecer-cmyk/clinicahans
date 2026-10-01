package br.com.clinicahans.finance;

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
    private final FinanceService service;
    public FinanceController(FinanceService service){this.service=service;}

    @PostMapping("/receivables")
    public FinanceRepository.Receivable create(@Valid @RequestBody ReceivableRequest r){return service.create(r.encounterId(),r.payerType(),r.payerReference(),r.amount(),r.dueDate());}

    @PostMapping("/receivables/{id}/payments")
    public FinanceRepository.Payment pay(@PathVariable UUID id,@Valid @RequestBody PaymentRequest r){return service.pay(id,r.amount(),r.method());}

    @GetMapping("/receivables")
    public List<FinanceRepository.Receivable> list(@RequestParam LocalDate from,@RequestParam LocalDate to,@RequestParam(defaultValue="100") int limit){return service.list(from,to,limit);}

    public record ReceivableRequest(@NotNull UUID encounterId,@Pattern(regexp="PRIVATE|INSURANCE") String payerType,
      @Size(max=120) String payerReference,@NotNull @DecimalMin("0.00") BigDecimal amount,LocalDate dueDate){}
    public record PaymentRequest(@NotNull @DecimalMin("0.01") BigDecimal amount,@NotBlank @Size(max=30) String method){}
}
