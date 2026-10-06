package br.com.clinicahans.integration;

import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.finance.FinanceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named="CI_POSTGRES", matches="true")
class CriticalDatabaseIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired FinanceService finance;

    @Test
    void migrationsCriticasEConstraintsDevemExistir() {
        Integer migration=jdbc.queryForObject(
            "select count(*) from schema_migration where version='V004__critical_integrity_constraints.sql'",Integer.class);
        Integer uniqueReview=jdbc.queryForObject("""
            select count(*) from pg_constraint
            where conname='uq_result_review_exam_result'
            """,Integer.class);
        Integer appointmentStatus=jdbc.queryForObject("""
            select count(*) from pg_constraint
            where conname='chk_appointment_status'
            """,Integer.class);

        assertEquals(1,migration);
        assertEquals(1,uniqueReview);
        assertEquals(1,appointmentStatus);
    }

    @Test
    void pagamentosConcorrentesNaoPodemUltrapassarRecebivel() throws Exception {
        UUID patientId=UUID.randomUUID(),doctorId=UUID.randomUUID(),encounterId=UUID.randomUUID(),receivableId=UUID.randomUUID();
        jdbc.update("insert into patient(id,full_name,birth_date) values (?,?,?)",patientId,"Paciente Teste",LocalDate.of(1990,1,1));
        jdbc.update("""
            insert into doctor(id,full_name,crm,crm_state,status,default_appointment_minutes,modality)
            values (?,?,?,?,?,?,?)
            """,doctorId,"Medico Teste",UUID.randomUUID().toString().substring(0,8),"SP","ACTIVE",30,"PRESENCIAL");
        jdbc.update("""
            insert into encounter(id,patient_id,doctor_id,status,assessment)
            values (?,?,?,'FINAL','teste')
            """,encounterId,patientId,doctorId);
        jdbc.update("""
            insert into receivable(id,encounter_id,payer_type,amount,status)
            values (?,?, 'PRIVATE',100.00,'OPEN')
            """,receivableId,encounterId);

        try(var executor=Executors.newFixedThreadPool(2)){
            var f1=executor.submit(()->attemptPayment(receivableId));
            var f2=executor.submit(()->attemptPayment(receivableId));
            int success=(f1.get()?1:0)+(f2.get()?1:0);
            BigDecimal total=jdbc.queryForObject("select coalesce(sum(amount),0) from payment where receivable_id=?",BigDecimal.class,receivableId);
            assertEquals(1,success);
            assertNotNull(total);
            assertTrue(total.compareTo(new BigDecimal("100.00"))<=0);
        } finally {
            jdbc.update("delete from audit_event where entity_id=?",receivableId.toString());
            jdbc.update("delete from payment where receivable_id=?",receivableId);
            jdbc.update("delete from receivable where id=?",receivableId);
            jdbc.update("delete from encounter where id=?",encounterId);
            jdbc.update("delete from doctor where id=?",doctorId);
            jdbc.update("delete from patient where id=?",patientId);
        }
    }

    private boolean attemptPayment(UUID receivableId){
        try{
            finance.pay(receivableId,new BigDecimal("60.00"),"TEST");
            return true;
        }catch(BusinessRuleException ex){
            return false;
        }
    }
}
