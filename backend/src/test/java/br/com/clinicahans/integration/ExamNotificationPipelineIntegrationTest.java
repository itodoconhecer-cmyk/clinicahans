package br.com.clinicahans.integration;

import br.com.clinicahans.UseCase.ExamNotificationUseCase;
import br.com.clinicahans.repository.ContinuityRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Apenas PostgreSQL isolado, LocalStack e captura Mailpit. Nunca SMTP externo. */
@SpringBootTest(properties={"clinicahans.exam-notifications.worker-enabled=true",
    "clinicahans.exam-notifications.poll-initial-delay-ms=3600000"})
@EnabledIfEnvironmentVariable(named="NOTIFICATION_PIPELINE_TEST",matches="true")
class ExamNotificationPipelineIntegrationTest {
    static final String suffix=UUID.randomUUID().toString().replace("-","");
    static final String bucket="clinicahans-test-"+suffix;
    static final String key="synthetic.txt";
    static S3Client s3;
    static SqsClient sqs;
    static String jobs,notices,dlq;
    @DynamicPropertySource static void configure(DynamicPropertyRegistry registry) {
        var credentials=StaticCredentialsProvider.create(AwsBasicCredentials.create("test","test"));
        var endpoint=URI.create(System.getenv().getOrDefault("PIPELINE_LOCALSTACK_URL","http://localstack:4566"));
        s3=S3Client.builder().region(Region.US_EAST_1).credentialsProvider(credentials).endpointOverride(endpoint).forcePathStyle(true).build();
        sqs=SqsClient.builder().region(Region.US_EAST_1).credentialsProvider(credentials).endpointOverride(endpoint).build();
        s3.createBucket(r->r.bucket(bucket));
        jobs=sqs.createQueue(r->r.queueName("notification-test-jobs-"+suffix)).queueUrl();
        dlq=sqs.createQueue(r->r.queueName("notification-test-dlq-"+suffix)).queueUrl();
        var arn=sqs.getQueueAttributes(r->r.queueUrl(dlq).attributeNamesWithStrings("QueueArn")).attributesAsStrings().get("QueueArn");
        notices=sqs.createQueue(r->r.queueName("notification-test-notices-"+suffix)
            .attributesWithStrings(java.util.Map.of("RedrivePolicy","{\"deadLetterTargetArn\":\""+arn+"\",\"maxReceiveCount\":\"5\"}"))).queueUrl();
        registry.add("clinicahans.exam-notifications.endpoint",endpoint::toString);
        registry.add("clinicahans.exam-notifications.bucket",()->bucket);
        registry.add("clinicahans.exam-notifications.jobs-queue",()->jobs);
        registry.add("clinicahans.exam-notifications.notifications-queue",()->notices);
        registry.add("clinicahans.exam-notifications.smtp-host",()->"mailpit");
        registry.add("clinicahans.exam-notifications.smtp-port",()->1025);
        registry.add("clinicahans.exam-notifications.external-delivery-enabled",()->false);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired ContinuityRepository continuity;
    @Autowired ExamNotificationUseCase useCase;
    @Autowired PlatformTransactionManager transactions;
    final UUID patient=UUID.randomUUID(),doctor=UUID.randomUUID(),user=UUID.randomUUID(),encounter=UUID.randomUUID();
    final String patientEmail="patient-"+suffix+"@example.invalid";
    final String doctorEmail="doctor-"+suffix+"@example.invalid";
    UUID order,result;

    @Test void onlyScheduledReadyAndAvailableResultsSendTwoPrivateDeduplicatedEmails() throws Exception {
        jdbc.update("insert into patient(id,full_name,birth_date,email) values (?,?,?,?)",patient,"Synthetic pipeline patient",LocalDate.of(1990,1,1),patientEmail);
        jdbc.update("insert into doctor(id,full_name,crm,crm_state,status,email) values (?,?,?,'SP','ACTIVE',?)",doctor,"Synthetic pipeline doctor",suffix.substring(0,12),doctorEmail);
        jdbc.update("insert into app_user(id,username,password_hash,active) values (?,?,?,false)",user,"pipeline-test-"+suffix,"not-a-login");
        jdbc.update("insert into encounter(id,patient_id,doctor_id,status,created_by) values (?,?,?,'DRAFT',?)",encounter,patient,doctor,user);
        order=continuity.createExam(patient,encounter,user,"Synthetic clinical name must stay private","ROUTINE",null).id();
        result=new TransactionTemplate(transactions).execute(tx->continuity.receiveResult(order,key,"text/plain").id());

        useCase.publishReady();useCase.pollNotifications();
        assertEquals(2,countStatus("WAITING"));assertEquals(0,messages(patientEmail).size());
        trigger();useCase.publishReady();
        assertEquals(2,countStatus("BLOCKED"));assertEquals(0,messages(patientEmail).size());

        s3.putObject(r->r.bucket(bucket).key(key),RequestBody.fromString("synthetic file without clinical data"));
        trigger();useCase.publishReady();useCase.pollNotifications();useCase.pollNotifications();
        assertEquals(2,countStatus("SENT"));
        for(String address:new String[]{patientEmail,doctorEmail}) {
            var messages=messages(address);assertEquals(1,messages.size());
            var mail=api("/api/v1/message/"+messages.get(0).path("ID").asText());
            assertEquals(1,mail.path("To").size());assertEquals(0,mail.path("Cc").size());assertEquals(0,mail.path("Bcc").size());
            assertEquals(0,mail.path("Attachments").size());
            String text=mail.path("Text").asText();
            assertFalse(text.isBlank());
            assertEquals(address,mail.path("To").get(0).path("Address").asText());
            assertFalse(text.contains("Synthetic clinical name"));assertFalse(text.contains(key));
            assertFalse(text.contains(patient.toString()));assertFalse(text.contains(doctor.toString()));
        }
        var ids=jdbc.queryForList("select id::text from exam_notification_outbox where result_id=?",String.class,result);
        trigger();useCase.publishReady();
        for(String id:ids) sqs.sendMessage(r->r.queueUrl(notices).messageBody(
            "{\"type\":\"EXAM_READY_EMAIL\",\"schemaVersion\":1,\"notificationId\":\""+id+"\"}"));
        useCase.pollNotifications();useCase.pollNotifications();
        assertEquals(1,messages(patientEmail).size());assertEquals(1,messages(doctorEmail).size());
        assertEquals(2,jdbc.queryForObject("select count(*) from audit_event where action='EXAM_NOTIFICATION_SENT' and entity_id in (select id::text from exam_notification_outbox where result_id=?)",Integer.class,result));
    }
    int countStatus(String status) { return jdbc.queryForObject("select count(*) from exam_notification_outbox where result_id=? and status=?",Integer.class,result,status); }
    void trigger() {
        sqs.sendMessage(r->r.queueUrl(jobs).messageBody("{\"type\":\"CHECK_READY_EXAMS\",\"schemaVersion\":1}"));
        useCase.pollJobs();
    }
    JsonNode messages(String address) throws Exception { return api("/api/v1/search?query="+URLEncoder.encode("to:"+address,StandardCharsets.UTF_8)).path("messages"); }
    JsonNode api(String path) throws Exception {
        var url=System.getenv().getOrDefault("PIPELINE_MAILPIT_URL","http://mailpit:8025");
        var response=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create(url+path)).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(200,response.statusCode());return new ObjectMapper().readTree(response.body());
    }
    @AfterEach void cleanDatabaseFixture() {
        if(result!=null) {
            jdbc.update("delete from audit_event where entity_type='EXAM_NOTIFICATION' and entity_id in (select id::text from exam_notification_outbox where result_id=?)",result);
            jdbc.update("delete from exam_notification_outbox where result_id=?",result);
            jdbc.update("delete from exam_result where id=?",result);
        }
        if(order!=null) jdbc.update("delete from exam_order where id=?",order);
        jdbc.update("delete from encounter where id=?",encounter);
        jdbc.update("delete from app_user where id=?",user);
        jdbc.update("delete from doctor where id=?",doctor);
        jdbc.update("delete from patient where id=?",patient);
    }
    @AfterAll static void cleanCloudFixtures() {
        if(s3!=null) { s3.deleteObject(r->r.bucket(bucket).key(key));s3.deleteBucket(r->r.bucket(bucket));s3.close(); }
        if(sqs!=null) { for(String queue:new String[]{jobs,notices,dlq}) if(queue!=null) sqs.deleteQueue(r->r.queueUrl(queue));sqs.close(); }
        // Mensagens sinteticas ficam no Mailpit para inspecao visual; nunca em SMTP externo.
    }
}
