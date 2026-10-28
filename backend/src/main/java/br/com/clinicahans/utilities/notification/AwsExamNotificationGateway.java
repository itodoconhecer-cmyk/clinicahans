package br.com.clinicahans.utilities.notification;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import br.com.clinicahans.DTO.NotificationQueueMessage;
import br.com.clinicahans.config.ExamNotificationProperties;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.sqs.SqsClient;
import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name="clinicahans.exam-notifications.worker-enabled",havingValue="true")
public class AwsExamNotificationGateway implements ExamNotificationGateway {
    private final SqsClient sqs;
    private final S3Client s3;
    private final JavaMailSender mail;
    private final ExamNotificationProperties properties;
    public AwsExamNotificationGateway(SqsClient sqs,S3Client s3,JavaMailSender mail,ExamNotificationProperties properties) {
        this.sqs=sqs; this.s3=s3; this.mail=mail; this.properties=properties;
    }
    private List<NotificationQueueMessage> receive(String queue) {
        return sqs.receiveMessage(r -> r.queueUrl(queue).maxNumberOfMessages(1)
            .waitTimeSeconds(2).visibilityTimeout(300)).messages().stream()
            .map(m -> new NotificationQueueMessage(m.body(),m.receiptHandle())).toList();
    }
    public List<NotificationQueueMessage> jobs() { return receive(properties.jobsQueue()); }
    public List<NotificationQueueMessage> notifications() { return receive(properties.notificationsQueue()); }
    public void acknowledgeJob(String receipt) { sqs.deleteMessage(r -> r.queueUrl(properties.jobsQueue()).receiptHandle(receipt)); }
    public void acknowledgeNotification(String receipt) { sqs.deleteMessage(r -> r.queueUrl(properties.notificationsQueue()).receiptHandle(receipt)); }
    public void publish(UUID id) {
        sqs.sendMessage(r -> r.queueUrl(properties.notificationsQueue()).messageBody(
            "{\"type\":\"EXAM_READY_EMAIL\",\"schemaVersion\":1,\"notificationId\":\""+id+"\"}"));
    }
    public boolean attachmentExists(String key) {
        if (key==null || key.isBlank()) return false;
        try { s3.headObject(r -> r.bucket(properties.bucket()).key(key)); return true; }
        catch (S3Exception exception) { if (exception.statusCode()==404) return false; throw exception; }
    }
    public boolean validEmail(String value) {
        if (value==null || value.isBlank() || value.contains("\r") || value.contains("\n")) return false;
        try {
            var parsed = InternetAddress.parse(value,true);
            if (parsed.length!=1 || !parsed[0].getAddress().equals(value) || !value.contains("@")) return false;
            parsed[0].validate(); return true;
        } catch (jakarta.mail.internet.AddressException invalid) { return false; }
    }
    public void send(ExamNotificationDelivery delivery) {
        if (!validEmail(delivery.email())) throw new IllegalArgumentException("INVALID_RECIPIENT");
        try {
            MimeMessage message = mail.createMimeMessage();
            var helper = new MimeMessageHelper(message,false,"UTF-8");
            helper.setFrom(properties.from()); helper.setTo(delivery.email());
            helper.setSubject("Clínica Hans — atualização disponível");
            String body = "Há uma atualização disponível na Clínica Hans.\n";
            body += delivery.recipientKind().equals("DOCTOR")
                ? "Acesse o sistema autenticado da clínica: " + properties.portalUrl() + "\n"
                : "Para orientações, entre em contato com a clínica pelos canais habituais.\n";
            helper.setText(body,false);
            message.setHeader("Message-ID","<"+delivery.id()+"@notifications.clinicahans.local>");
            mail.send(message);
        } catch (jakarta.mail.MessagingException invalid) { throw new IllegalStateException("MAIL_FORMAT_FAILED"); }
    }
}
