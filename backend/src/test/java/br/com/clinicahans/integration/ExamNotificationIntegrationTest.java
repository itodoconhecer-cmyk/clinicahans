package br.com.clinicahans.integration;

import br.com.clinicahans.repository.ContinuityRepository;
import br.com.clinicahans.repository.ExamNotificationRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.Executors;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named="CI_POSTGRES",matches="true")
class ExamNotificationIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ContinuityRepository continuity;
    @Autowired ExamNotificationRepository notifications;
    @Autowired PlatformTransactionManager transactions;
    UUID patient,doctor,user,encounter,order,result;
    @BeforeEach void fixture() {
        patient=UUID.randomUUID();doctor=UUID.randomUUID();user=UUID.randomUUID();encounter=UUID.randomUUID();
        jdbc.update("insert into patient(id,full_name,birth_date,email) values (?,?,?,?)",patient,"Synthetic notification patient",LocalDate.of(1990,1,1),"patient@example.invalid");
        jdbc.update("insert into doctor(id,full_name,crm,crm_state,status,email) values (?,?,?,'SP','ACTIVE',?)",doctor,"Synthetic notification doctor",doctor.toString().substring(0,12),"doctor@example.invalid");
        jdbc.update("insert into app_user(id,username,password_hash,active) values (?,?,?,false)",user,"notification-test-"+user,"not-a-login");
        jdbc.update("insert into encounter(id,patient_id,doctor_id,status,created_by) values (?,?,?,'DRAFT',?)",encounter,patient,doctor,user);
        order=continuity.createExam(patient,encounter,user,"Synthetic exam","ROUTINE",null).id();
    }
    UUID receive() {
        return new TransactionTemplate(transactions).execute(tx -> continuity.receiveResult(order,"synthetic.pdf","application/pdf").id());
    }
    @AfterEach void cleanup() {
        jdbc.update("delete from audit_event where entity_type='EXAM_NOTIFICATION' and entity_id in (select id::text from exam_notification_outbox where result_id in (select id from exam_result_locator where exam_order_id=?))",order);
        jdbc.update("delete from exam_notification_outbox where result_id in (select id from exam_result_locator where exam_order_id=?)",order);
        jdbc.update("delete from exam_result where exam_order_id=?",order);
        jdbc.update("delete from exam_order where id=?",order);
        jdbc.update("delete from encounter where id=?",encounter);
        jdbc.update("delete from doctor where id=?",doctor);
        jdbc.update("delete from patient where id=?",patient);
        jdbc.update("delete from app_user where id=?",user);
    }
    @Test void resultAndBothIntentsAreAtomic() {
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(tx -> {
            continuity.receiveResult(order,"synthetic.pdf","application/pdf");
            throw new IllegalStateException("rollback");
        }));
        assertEquals(0,jdbc.queryForObject("select count(*) from exam_result_locator where exam_order_id=?",Integer.class,order));
        assertEquals(0,jdbc.queryForObject("select count(*) from exam_notification_outbox",Integer.class));
        result=receive();
        assertEquals(2,jdbc.queryForObject("select count(*) from exam_notification_outbox where result_id=? and status='WAITING'",Integer.class,result));
        assertTrue(notifications.claimPublication(UUID.randomUUID()).isEmpty());
    }
    @Test void concurrentClaimsDoNotDuplicateDeliveryAndSentIsAudited() throws Exception {
        result=receive();notifications.releasePending();
        UUID first=notifications.claimPublication(UUID.randomUUID()).orElseThrow();
        UUID second=notifications.claimPublication(UUID.randomUUID()).orElseThrow();
        assertNotEquals(first,second);assertTrue(notifications.claimPublication(UUID.randomUUID()).isEmpty());
        UUID tokenA=UUID.randomUUID(),tokenB=UUID.randomUUID();
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->notifications.claimDelivery(first,tokenA));
            var b=pool.submit(()->notifications.claimDelivery(first,tokenB));
            var deliveryA=a.get();var deliveryB=b.get();
            assertNotEquals(deliveryA.isPresent(),deliveryB.isPresent());
            UUID owner=deliveryA.isPresent()?tokenA:tokenB;
            assertTrue(notifications.beginAttempt(first,owner));
            notifications.sent(first,owner);
        }
        assertTrue(notifications.claimDelivery(first,UUID.randomUUID()).isEmpty());
        assertEquals(1,jdbc.queryForObject("select count(*) from audit_event where action='EXAM_NOTIFICATION_SENT' and entity_id=?",Integer.class,first.toString()));
    }
    @Test void invalidRecipientIsIndependentAndExpiredLeasesRecover() {
        result=receive();notifications.releasePending();
        UUID token=UUID.randomUUID();UUID id=notifications.claimPublication(token).orElseThrow();
        var delivery=notifications.findDelivery(id).orElseThrow();
        String target=delivery.recipientKind().equals("PATIENT")?"patient":"doctor";
        UUID targetId=delivery.recipientKind().equals("PATIENT")?patient:doctor;
        if(target.equals("patient")) jdbc.update("update patient set email=null where id=?",targetId);
        else jdbc.update("update doctor set email=null where id=?",targetId);
        assertNull(notifications.findDelivery(id).orElseThrow().email());
        notifications.block(id,token,"INVALID_RECIPIENT");
        UUID nextToken=UUID.randomUUID();UUID other=notifications.claimPublication(nextToken).orElseThrow();
        assertNotNull(notifications.findDelivery(other).orElseThrow().email());
        jdbc.update("update exam_notification_outbox set lease_until=now()-interval '1 minute' where id=?",other);
        notifications.releasePending();
        assertEquals("READY",jdbc.queryForObject("select status from exam_notification_outbox where id=?",String.class,other));
    }
}
