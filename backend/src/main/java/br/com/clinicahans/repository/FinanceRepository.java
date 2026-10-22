package br.com.clinicahans.repository;

import br.com.clinicahans.model.billing.Payment;
import br.com.clinicahans.model.billing.Receivable;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class FinanceRepository {
    private final JdbcTemplate jdbc;
    public FinanceRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public Receivable create(UUID encounterId,String payerType,String payerReference,BigDecimal amount,LocalDate dueDate){
        String status=amount.signum()==0?"PAID":"OPEN";
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into receivable(id,encounter_id,payer_type,payer_reference,amount,due_date,status)
          values (?,?,?,?,?,?,?)
          """,id,encounterId,payerType,payerReference,amount,dueDate,status);
        return get(id);
    }

    public Receivable get(UUID id){
        return jdbc.query("""
          select r.id,r.encounter_id,r.payer_type,r.payer_reference,r.amount,r.due_date,r.status,r.created_at
          from receivable_locator l
          join receivable r on r.id=l.id and r.created_at=l.partition_timestamp
          where l.id=?
          """,(rs,n)->new Receivable(rs.getObject("id",UUID.class),rs.getObject("encounter_id",UUID.class),
            rs.getString("payer_type"),rs.getString("payer_reference"),rs.getBigDecimal("amount"),
            rs.getObject("due_date",LocalDate.class),rs.getString("status"),rs.getObject("created_at",OffsetDateTime.class)),id)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Lançamento financeiro não encontrado."));
    }

    public Receivable getForUpdate(UUID id){
        return jdbc.query("""
          select r.id,r.encounter_id,r.payer_type,r.payer_reference,r.amount,r.due_date,r.status,r.created_at
          from receivable_locator l
          join receivable r on r.id=l.id and r.created_at=l.partition_timestamp
          where l.id=? for update of r
          """,(rs,n)->new Receivable(rs.getObject("id",UUID.class),rs.getObject("encounter_id",UUID.class),
            rs.getString("payer_type"),rs.getString("payer_reference"),rs.getBigDecimal("amount"),
            rs.getObject("due_date",LocalDate.class),rs.getString("status"),rs.getObject("created_at",OffsetDateTime.class)),id)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Lançamento financeiro não encontrado."));
    }

    public Payment pay(UUID receivableId,BigDecimal amount,String method){
        var r=getForUpdate(receivableId);
        BigDecimal paid=jdbc.queryForObject("""
          select coalesce(sum(p.amount),0)
          from payment_locator l
          join payment p on p.id=l.id and p.paid_at=l.partition_timestamp
          where l.receivable_id=?
          """,BigDecimal.class,receivableId);
        if(paid==null) paid=BigDecimal.ZERO;
        if(amount.signum()<=0 || paid.add(amount).compareTo(r.amount())>0) throw new BusinessRuleException("Valor de pagamento inválido.");
        UUID id=UUID.randomUUID();
        jdbc.update("insert into payment(id,receivable_id,amount,method) values (?,?,?,?)",id,receivableId,amount,method);
        BigDecimal newPaid=paid.add(amount);
        jdbc.update("""
          update receivable r set status=?
          from receivable_locator l
          where r.id=l.id and r.created_at=l.partition_timestamp and l.id=?
          """,newPaid.compareTo(r.amount())>=0?"PAID":"PARTIAL",receivableId);
        return new Payment(id,receivableId,amount,method,OffsetDateTime.now());
    }

    public List<Receivable> list(LocalDate from,LocalDate to,int limit){
        return jdbc.query("""
          select id,encounter_id,payer_type,payer_reference,amount,due_date,status,created_at
          from receivable
          where created_at >= (?::date::timestamp at time zone 'America/Sao_Paulo')
            and created_at < ((?::date + interval '1 day') at time zone 'America/Sao_Paulo')
          order by created_at desc limit ?
          """,(rs,n)->new Receivable(rs.getObject("id",UUID.class),rs.getObject("encounter_id",UUID.class),
            rs.getString("payer_type"),rs.getString("payer_reference"),rs.getBigDecimal("amount"),
            rs.getObject("due_date",LocalDate.class),rs.getString("status"),rs.getObject("created_at",OffsetDateTime.class)),
            from,to,Math.min(Math.max(limit,1),200));
    }

}
