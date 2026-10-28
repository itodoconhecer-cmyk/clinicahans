package br.com.clinicahans.repository;

import br.com.clinicahans.DTO.ExamNotificationDelivery;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ExamNotificationRepository {
    private final JdbcTemplate jdbc;
    public ExamNotificationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional
    public int releasePending() {
        jdbc.update("""
            update exam_notification_outbox set status='FAILED',last_error_code='LEASE_EXPIRED_AFTER_LIMIT',
              lease_token=null,lease_until=null
            where status='SENDING' and lease_until < now() and attempts>=5
            """);
        return jdbc.update("""
            update exam_notification_outbox set status='READY',lease_token=null,lease_until=null
            where status in ('WAITING','BLOCKED')
               or (status in ('PUBLISHING','SENDING') and lease_until < now() and attempts < 5)
               or (status='QUEUED' and published_at < now()-interval '4 hours' and attempts < 5)
            """);
    }

    public Optional<UUID> claimPublication(UUID token) {
        return jdbc.query("""
            with candidate as (
              select id from exam_notification_outbox where status='READY'
              order by created_at,id for update skip locked limit 1
            )
            update exam_notification_outbox n
            set status='PUBLISHING',lease_token=?,lease_until=now()+interval '5 minutes'
            from candidate c where n.id=c.id returning n.id
            """, (rs,n) -> rs.getObject(1,UUID.class), token).stream().findFirst();
    }

    public Optional<ExamNotificationDelivery> claimDelivery(UUID id, UUID token) {
        int changed = jdbc.update("""
            update exam_notification_outbox set status='SENDING',lease_token=?,
              lease_until=now()+interval '5 minutes'
            where id=? and attempts < 5 and (status in ('QUEUED','PUBLISHING')
              or (status='SENDING' and lease_until < now()))
            """, token, id);
        return changed == 1 ? findDelivery(id) : Optional.empty();
    }

    public Optional<ExamNotificationDelivery> findDelivery(UUID id) {
        return jdbc.query("""
            select n.id,n.recipient_kind,n.attempts,r.storage_key,
              case when n.recipient_kind='PATIENT' then p.email else d.email end as email,
              (o.status in ('RESULT_RECEIVED','REVIEWED') and p.status='ACTIVE'
                and (n.recipient_kind='PATIENT' or d.status='ACTIVE')) as eligible
            from exam_notification_outbox n
            join exam_result_locator l on l.id=n.result_id
            join exam_result r on r.id=l.id and r.received_at=l.partition_timestamp
            join exam_order o on o.id=l.exam_order_id
            join patient p on p.id=o.patient_id
            left join encounter_locator e on e.id=o.encounter_id
            left join doctor d on d.id=e.doctor_id
            where n.id=?
            """, (rs,n) -> new ExamNotificationDelivery(rs.getObject("id",UUID.class),
                rs.getString("recipient_kind"),rs.getString("email"),rs.getString("storage_key"),
                rs.getBoolean("eligible"),rs.getInt("attempts")), id).stream().findFirst();
    }

    public boolean leaseHeld(UUID id, UUID token) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            select exists(select 1 from exam_notification_outbox
              where id=? and lease_token=? and lease_until > now())
            """, Boolean.class, id, token));
    }

    public void queued(UUID id, UUID token) {
        jdbc.update("""
            update exam_notification_outbox set status='QUEUED',published_at=now(),
              lease_token=null,lease_until=null,last_error_code=null
            where id=? and lease_token=? and status='PUBLISHING'
            """, id, token);
    }

    public void block(UUID id, UUID token, String code) {
        jdbc.update("""
            update exam_notification_outbox set status='BLOCKED',last_error_code=?,
              lease_token=null,lease_until=null where id=? and lease_token=?
            """, code, id, token);
    }

    public void publicationFailed(UUID id, UUID token) {
        // Nova publicacao so no proximo job, evitando loop de rede sem limite.
        block(id, token, "PUBLICATION_FAILED");
    }

    public boolean beginAttempt(UUID id, UUID token) {
        return jdbc.update("""
            update exam_notification_outbox set attempts=attempts+1
            where id=? and lease_token=? and status='SENDING' and lease_until > now() and attempts < 5
            """, id, token) == 1;
    }

    public void deliveryFailed(UUID id, UUID token) {
        jdbc.update("""
            update exam_notification_outbox set status=case when attempts>=5 then 'FAILED' else 'QUEUED' end,
              last_error_code='SMTP_FAILED',lease_token=null,lease_until=null
            where id=? and lease_token=?
            """, id, token);
    }

    @Transactional
    public void sent(UUID id, UUID token) {
        int changed = jdbc.update("""
            update exam_notification_outbox set status='SENT',sent_at=now(),
              lease_token=null,lease_until=null,last_error_code=null
            where id=? and lease_token=? and status='SENDING'
            """, id, token);
        if (changed != 1) throw new IllegalStateException("NOTIFICATION_LEASE_LOST");
        jdbc.update("""
            insert into audit_event(id,username,action,entity_type,entity_id,correlation_id)
            values (?,'notification-worker','EXAM_NOTIFICATION_SENT','EXAM_NOTIFICATION',?,?)
            """, UUID.randomUUID(),id.toString(),id.toString());
    }
}
