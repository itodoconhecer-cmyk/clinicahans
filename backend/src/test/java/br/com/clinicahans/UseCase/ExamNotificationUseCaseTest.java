package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import br.com.clinicahans.DTO.NotificationQueueMessage;
import br.com.clinicahans.repository.ExamNotificationRepository;
import br.com.clinicahans.utilities.notification.ExamNotificationGateway;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExamNotificationUseCaseTest {
    final ExamNotificationRepository repository=mock(ExamNotificationRepository.class);
    final ExamNotificationGateway gateway=mock(ExamNotificationGateway.class);
    final ExamNotificationUseCase useCase=new ExamNotificationUseCase(repository,gateway,new ObjectMapper(),new SimpleMeterRegistry());
    final UUID id=UUID.randomUUID();
    final NotificationQueueMessage message=new NotificationQueueMessage(
        "{\"type\":\"EXAM_READY_EMAIL\",\"schemaVersion\":1,\"notificationId\":\""+id+"\"}","receipt");
    final ExamNotificationDelivery delivery=new ExamNotificationDelivery(id,"PATIENT","patient@example.invalid","synthetic.pdf",true,0);

    void readyDelivery() {
        when(gateway.notifications()).thenReturn(List.of(message));
        when(repository.claimDelivery(eq(id),any())).thenReturn(Optional.of(delivery));
        when(gateway.validEmail(delivery.email())).thenReturn(true);
        when(gateway.attachmentExists(delivery.storageKey())).thenReturn(true);
        when(repository.beginAttempt(eq(id),any())).thenReturn(true);
    }
    @Test void validJobReleasesPendingBeforeAcknowledgement() {
        when(gateway.jobs()).thenReturn(List.of(new NotificationQueueMessage("{\"type\":\"CHECK_READY_EXAMS\",\"schemaVersion\":1}","job")));
        useCase.pollJobs();
        var order=inOrder(repository,gateway);
        order.verify(repository).releasePending(); order.verify(gateway).acknowledgeJob("job");
    }
    @Test void malformedJobIsNotAcknowledgedOrExecuted() {
        when(gateway.jobs()).thenReturn(List.of(new NotificationQueueMessage("{\"type\":\"CHECK_READY_EXAMS\",\"schemaVersion\":2}","job")));
        useCase.pollJobs();
        verify(repository,never()).releasePending(); verify(gateway,never()).acknowledgeJob(any());
    }
    @Test void missingAttachmentBlocksPublication() {
        when(repository.claimPublication(any())).thenReturn(Optional.of(id),Optional.empty());
        when(repository.findDelivery(id)).thenReturn(Optional.of(delivery));
        when(gateway.validEmail(delivery.email())).thenReturn(true);
        when(gateway.attachmentExists(delivery.storageKey())).thenReturn(false);
        useCase.publishReady();
        verify(repository).block(eq(id),any(),eq("ATTACHMENT_UNAVAILABLE")); verify(gateway,never()).publish(any());
    }
    @Test void smtpFailureIsRetriedWithoutAcknowledgingMessage() {
        readyDelivery(); doThrow(new IllegalStateException("synthetic SMTP failure")).when(gateway).send(any());
        useCase.pollNotifications();
        verify(repository).deliveryFailed(eq(id),any()); verify(repository,never()).sent(any(),any());
        verify(gateway,never()).acknowledgeNotification(any());
    }
    @Test void sentStatusIsPersistedBeforeAcknowledgement() {
        readyDelivery(); useCase.pollNotifications();
        var order=inOrder(repository,gateway);
        order.verify(gateway).send(delivery); order.verify(repository).sent(eq(id),any());
        order.verify(gateway).acknowledgeNotification("receipt");
    }
    @Test void alreadySentOrLeasedDuplicateDoesNotSend() {
        when(gateway.notifications()).thenReturn(List.of(message));
        when(repository.claimDelivery(eq(id),any())).thenReturn(Optional.empty());
        useCase.pollNotifications();
        verify(gateway,never()).send(any()); verify(gateway).acknowledgeNotification("receipt");
    }
    @Test void invalidAddressDoesNotSendAndDoesNotBlockOtherRecipients() {
        readyDelivery(); when(gateway.validEmail(delivery.email())).thenReturn(false);
        useCase.pollNotifications();
        verify(repository).block(eq(id),any(),eq("INVALID_RECIPIENT"));
        verify(gateway,never()).send(any()); verify(gateway).acknowledgeNotification("receipt");
    }
    @Test void expiredLeaseNeverSends() {
        readyDelivery(); when(repository.beginAttempt(eq(id),any())).thenReturn(false);
        useCase.pollNotifications(); verify(gateway,never()).send(any());
    }
}
