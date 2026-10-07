package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.FinanceRepository;
import br.com.clinicahans.model.billing.Payment;
import br.com.clinicahans.model.billing.Receivable;

import br.com.clinicahans.repository.ClinicalRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class FinanceUseCase {
    private final FinanceRepository repository; private final ClinicalRepository clinical; private final AuditUseCase auditUseCase;
    public FinanceUseCase(FinanceRepository repository,ClinicalRepository clinical,AuditUseCase auditUseCase){this.repository=repository;this.clinical=clinical;this.auditUseCase=auditUseCase;}

    @Transactional
    public Receivable create(UUID encounterId,String payerType,String payerReference,BigDecimal amount,LocalDate dueDate){
        var encounter=clinical.getEncounter(encounterId);
        if(!"FINAL".equals(encounter.status())) throw new BusinessRuleException("Faturamento exige atendimento finalizado.");
        var r=repository.create(encounterId,payerType,payerReference,amount,dueDate);
        auditUseCase.record("RECEIVABLE_CREATED","RECEIVABLE",r.id()); return r;
    }

    @Transactional
    public Payment pay(UUID id,BigDecimal amount,String method){
        var p=repository.pay(id,amount,method); auditUseCase.record("PAYMENT_RECORDED","RECEIVABLE",id); return p;
    }
    public List<Receivable> list(LocalDate from,LocalDate to,int limit){return repository.list(from,to,limit);}
}
