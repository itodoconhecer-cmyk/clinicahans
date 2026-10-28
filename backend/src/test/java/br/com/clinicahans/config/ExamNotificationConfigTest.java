package br.com.clinicahans.config;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExamNotificationConfigTest {
    @Test void externalSmtpRequiresExplicitEnabling() {
        var p=new ExamNotificationProperties(true,"us-east-1","","bucket","jobs","notices",
            "smtp.example.invalid",587,"","","notices@example.invalid","https://example.invalid",false);
        assertThrows(IllegalStateException.class,()->new ExamNotificationConfig().notificationMail(p));
    }
    @Test void localCaptureCanBeConfiguredWithoutExternalDelivery() {
        var p=new ExamNotificationProperties(true,"us-east-1","","bucket","jobs","notices",
            "mailpit",1025,"","","notices@example.invalid","http://localhost",false);
        assertNotNull(new ExamNotificationConfig().notificationMail(p));
    }
}
