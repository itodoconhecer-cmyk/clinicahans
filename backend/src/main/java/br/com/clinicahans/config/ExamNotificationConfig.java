package br.com.clinicahans.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;
import java.net.URI;
import java.time.Duration;
import java.util.Set;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="clinicahans.exam-notifications.worker-enabled", havingValue="true")
@EnableConfigurationProperties(ExamNotificationProperties.class)
public class ExamNotificationConfig {
    private static ClientOverrideConfiguration timeouts() {
        return ClientOverrideConfiguration.builder().apiCallTimeout(Duration.ofSeconds(15))
            .apiCallAttemptTimeout(Duration.ofSeconds(5)).build();
    }
    @Bean
    SqsClient notificationSqs(ExamNotificationProperties p) {
        if (p.jobsQueue().isBlank() || p.notificationsQueue().isBlank())
            throw new IllegalStateException("NOTIFICATION_QUEUE_CONFIGURATION_REQUIRED");
        var builder = SqsClient.builder().region(Region.of(p.region())).overrideConfiguration(timeouts())
            .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(3)).socketTimeout(Duration.ofSeconds(5)));
        if (!p.endpoint().isBlank()) builder.endpointOverride(URI.create(p.endpoint()));
        return builder.build();
    }
    @Bean
    S3Client notificationS3(ExamNotificationProperties p) {
        var builder = S3Client.builder().region(Region.of(p.region())).overrideConfiguration(timeouts())
            .httpClientBuilder(UrlConnectionHttpClient.builder().connectionTimeout(Duration.ofSeconds(3)).socketTimeout(Duration.ofSeconds(5)));
        if (!p.endpoint().isBlank()) builder.endpointOverride(URI.create(p.endpoint())).forcePathStyle(true);
        return builder.build();
    }
    @Bean
    JavaMailSender notificationMail(ExamNotificationProperties p) {
        if (!p.externalDeliveryEnabled() && !Set.of("mailpit","localhost","127.0.0.1","::1").contains(p.smtpHost()))
            throw new IllegalStateException("EXTERNAL_NOTIFICATION_DELIVERY_DISABLED");
        var sender = new JavaMailSenderImpl();
        sender.setHost(p.smtpHost()); sender.setPort(p.smtpPort()); sender.setDefaultEncoding("UTF-8");
        sender.setUsername(p.smtpUsername()); sender.setPassword(p.smtpPassword());
        var props = sender.getJavaMailProperties();
        props.setProperty("mail.smtp.connectiontimeout","5000");
        props.setProperty("mail.smtp.timeout","5000");
        props.setProperty("mail.smtp.writetimeout","5000");
        props.setProperty("mail.smtp.auth",String.valueOf(!p.smtpUsername().isBlank()));
        props.setProperty("mail.smtp.starttls.enable",String.valueOf(p.externalDeliveryEnabled()));
        props.setProperty("mail.smtp.starttls.required",String.valueOf(p.externalDeliveryEnabled()));
        props.setProperty("mail.smtp.ssl.checkserveridentity","true");
        return sender;
    }
}
