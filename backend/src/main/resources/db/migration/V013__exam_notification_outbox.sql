CREATE TABLE exam_notification_outbox (
  id uuid PRIMARY KEY,
  result_id uuid NOT NULL REFERENCES exam_result_locator(id),
  recipient_kind varchar(10) NOT NULL CHECK (recipient_kind IN ('PATIENT','DOCTOR')),
  status varchar(20) NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING','READY','PUBLISHING','QUEUED','SENDING','BLOCKED','FAILED','SENT')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code varchar(60),
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  sent_at timestamptz,
  UNIQUE (result_id, recipient_kind)
);
CREATE INDEX idx_exam_notification_pending ON exam_notification_outbox(status, created_at)
  WHERE status <> 'SENT';
