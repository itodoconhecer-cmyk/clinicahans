package br.com.clinicahans.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix="clinicahans.exam-notifications")
public record ExamNotificationProperties(boolean workerEnabled, String region, String endpoint,
    String bucket, String jobsQueue, String notificationsQueue, String smtpHost, int smtpPort,
    String smtpUsername, String smtpPassword, String from, String portalUrl, boolean externalDeliveryEnabled) {
    @Override public String toString() { return "ExamNotificationProperties[redacted]"; }
}
