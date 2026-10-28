package br.com.clinicahans.DTO;

public record NotificationQueueMessage(String body, String receiptHandle) {
    @Override public String toString() { return "NotificationQueueMessage[redacted]"; }
}
