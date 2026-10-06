package br.com.clinicahans.UseCase;

import br.com.clinicahans.repository.FinanceRepository;

import br.com.clinicahans.UseCase.AuditUseCase;
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
    private final FinanceRepository repository; private final ClinicalRepository clinical; private final AuditUseCase audit;
    public FinanceUseCase(FinanceRepository repository,ClinicalRepository clinical,AuditUseCase audit){this.repository=repository;this.clinical=clinical;this.audit=audit;}

    @Transactional
    public FinanceRepository.Receivable create(UUID encounterId,String payerType,String payerReference,BigDecimal amount,LocalDate dueDate){
        var encounter=clinical.getEncounter(encounterId);
        if(!"FINAL".equals(encounter.status())) throw new BusinessRuleException("Faturamento exige atendimento finalizado.");
        var r=repository.create(encounterId,payerType,payerReference,amount,dueDate);
        audit.record("RECEIVABLE_CREATED","RECEIVABLE",r.id()); return r;
    }

    @Transactional
    public FinanceRepository.Payment pay(UUID id,BigDecimal amount,String method){
        var p=repository.pay(id,amount,method); audit.record("PAYMENT_RECORDED","RECEIVABLE",id); return p;
    }
    public List<FinanceRepository.Receivable> list(LocalDate from,LocalDate to,int limit){return repository.list(from,to,limit);}
}
