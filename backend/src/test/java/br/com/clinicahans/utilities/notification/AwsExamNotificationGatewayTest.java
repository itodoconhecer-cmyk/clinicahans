package br.com.clinicahans.utilities.notification;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import br.com.clinicahans.config.ExamNotificationProperties;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;
import java.util.Properties;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AwsExamNotificationGatewayTest {
    final JavaMailSender mail=mock(JavaMailSender.class);
    final ExamNotificationProperties properties=new ExamNotificationProperties(true,"us-east-1","","bucket","jobs","notices",
        "mailpit",1025,"","","notices@example.invalid","http://localhost/login/login.html",false);
    final AwsExamNotificationGateway gateway=new AwsExamNotificationGateway(mock(SqsClient.class),mock(S3Client.class),mail,properties);
    @Test void eachMessageHasSingleRecipientAndNoClinicalDataOrAttachment() throws Exception {
        var message=new MimeMessage(Session.getInstance(new Properties()));
        when(mail.createMimeMessage()).thenReturn(message);
        UUID id=UUID.randomUUID();
        gateway.send(new ExamNotificationDelivery(id,"PATIENT","patient@example.invalid","secret-storage-key",true,0));
        verify(mail).send(message);
        assertEquals(1,message.getRecipients(Message.RecipientType.TO).length);
        assertNull(message.getRecipients(Message.RecipientType.CC)); assertNull(message.getRecipients(Message.RecipientType.BCC));
        assertTrue(message.getContent() instanceof String);
        String body=message.getContent().toString();
        assertFalse(body.contains("secret-storage-key")); assertFalse(body.contains(id.toString()));
        assertFalse(body.contains("/login/"));
        assertEquals("<"+id+"@notifications.clinicahans.local>",message.getHeader("Message-ID",null));
    }
    @Test void rejectsHeaderInjectionAndMultipleRecipients() {
        assertFalse(gateway.validEmail("a@example.invalid\r\nBcc: b@example.invalid"));
        assertFalse(gateway.validEmail("a@example.invalid,b@example.invalid"));
        assertFalse(gateway.validEmail("")); assertTrue(gateway.validEmail("a@example.invalid"));
    }
}
