package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import br.com.clinicahans.DTO.NotificationQueueMessage;
import br.com.clinicahans.repository.ExamNotificationRepository;
import br.com.clinicahans.utilities.notification.ExamNotificationGateway;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
@ConditionalOnProperty(name="clinicahans.exam-notifications.worker-enabled",havingValue="true")
public class ExamNotificationUseCase {
    private static final Logger LOG=LoggerFactory.getLogger(ExamNotificationUseCase.class);
    private final ExamNotificationRepository repository;
    private final ExamNotificationGateway gateway;
    private final ObjectMapper json;
    private final MeterRegistry metrics;
    public ExamNotificationUseCase(ExamNotificationRepository repository,ExamNotificationGateway gateway,
                                    ObjectMapper json,MeterRegistry metrics) {
        this.repository=repository; this.gateway=gateway; this.json=json; this.metrics=metrics;
    }
    @Scheduled(fixedDelayString="${clinicahans.exam-notifications.poll-delay-ms:1000}",initialDelayString="${clinicahans.exam-notifications.poll-initial-delay-ms:10000}")
    public void pollJobs() {
        try {
            for (var message : gateway.jobs()) {
                try {
                    decode(message,"CHECK_READY_EXAMS");
                    repository.releasePending();
                    gateway.acknowledgeJob(message.receiptHandle());
                    count("jobs");
                } catch (Exception failure) { failed("job_failed"); }
            }
        } catch (Exception failure) { failed("job_poll_failed"); }
    }
    @Scheduled(fixedDelayString="${clinicahans.exam-notifications.poll-delay-ms:1000}",initialDelayString="${clinicahans.exam-notifications.poll-initial-delay-ms:10000}")
    public void publishReady() {
        try {
            for (int batch=0;batch<25;batch++) {
                UUID token=UUID.randomUUID();
                var claimed=repository.claimPublication(token);
                if (claimed.isEmpty()) break;
                UUID id=claimed.get();
                try {
                    var delivery=repository.findDelivery(id);
                    if (delivery.isEmpty()) { repository.block(id,token,"RESULT_UNAVAILABLE"); continue; }
                    String blocked=blockedReason(delivery.get());
                    if (blocked!=null) { repository.block(id,token,blocked); count("blocked"); continue; }
                    if (!repository.leaseHeld(id,token)) continue;
                    gateway.publish(id);
                    repository.queued(id,token);
                    count("published");
                } catch (Exception failure) { repository.publicationFailed(id,token); failed("publication_failed"); }
            }
        } catch (Exception failure) { failed("outbox_poll_failed"); }
    }
    @Scheduled(fixedDelayString="${clinicahans.exam-notifications.poll-delay-ms:1000}",initialDelayString="${clinicahans.exam-notifications.poll-initial-delay-ms:10000}")
    public void pollNotifications() {
        try {
            for (var message:gateway.notifications()) {
                try {
                    var payload=decode(message,"EXAM_READY_EMAIL");
                    UUID id=UUID.fromString(payload.path("notificationId").asText());
                    UUID token=UUID.randomUUID();
                    var delivery=repository.claimDelivery(id,token);
                    if (delivery.isEmpty()) {
                        // SENT ou outra entrega com lease ativo: duplicata nao envia novamente.
                        gateway.acknowledgeNotification(message.receiptHandle()); continue;
                    }
                    try {
                        String blocked=blockedReason(delivery.get());
                        if (blocked!=null) {
                            repository.block(id,token,blocked);
                            gateway.acknowledgeNotification(message.receiptHandle()); count("blocked"); continue;
                        }
                        if (!repository.beginAttempt(id,token)) continue;
                        gateway.send(delivery.get());
                        repository.sent(id,token);
                    } catch (Exception failure) {
                        repository.deliveryFailed(id,token); failed("delivery_failed"); continue;
                    }
                    gateway.acknowledgeNotification(message.receiptHandle()); count("sent");
                } catch (Exception failure) { failed("notification_failed"); }
            }
        } catch (Exception failure) { failed("notification_poll_failed"); }
    }
    private String blockedReason(ExamNotificationDelivery delivery) {
        if (!delivery.eligible()) return "RECIPIENT_OR_RESULT_INACTIVE";
        if (!gateway.validEmail(delivery.email())) return "INVALID_RECIPIENT";
        if (!gateway.attachmentExists(delivery.storageKey())) return "ATTACHMENT_UNAVAILABLE";
        return null;
    }
    private JsonNode decode(NotificationQueueMessage message,String type) throws Exception {
        var payload=json.readTree(message.body());
        if (payload==null || !payload.isObject() || !type.equals(payload.path("type").asText())
            || !payload.path("schemaVersion").isIntegralNumber() || payload.path("schemaVersion").asInt()!=1)
            throw new IllegalArgumentException("INVALID_NOTIFICATION_CONTRACT");
        return payload;
    }
    private void count(String event) { metrics.counter("clinic.exam.notifications","event",event).increment(); }
    private void failed(String code) {
        count(code);
        // Nao anexar excecao, payload ou endereco: erros de SMTP/SDK podem conter dados pessoais.
        LOG.warn("Notification worker operation failed: {}",code);
    }
}
