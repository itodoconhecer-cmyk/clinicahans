package br.com.clinicahans.utilities.notification;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import br.com.clinicahans.DTO.NotificationQueueMessage;
import java.util.List;
import java.util.UUID;

public interface ExamNotificationGateway {
    List<NotificationQueueMessage> jobs();
    List<NotificationQueueMessage> notifications();
    void acknowledgeJob(String receipt);
    void acknowledgeNotification(String receipt);
    void publish(UUID id);
    boolean attachmentExists(String key);
    boolean validEmail(String address);
    void send(ExamNotificationDelivery delivery);
}
