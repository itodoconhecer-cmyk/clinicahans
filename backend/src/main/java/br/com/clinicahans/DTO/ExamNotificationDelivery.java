package br.com.clinicahans.DTO;

import java.util.UUID;

/** Projecao de trabalho interna. Nao deve ser serializada em respostas ou logs. */
public record ExamNotificationDelivery(UUID id, String recipientKind, String email,
                                       String storageKey, boolean eligible, int attempts) {
    @Override public String toString() { return "ExamNotificationDelivery[redacted]"; }
}
