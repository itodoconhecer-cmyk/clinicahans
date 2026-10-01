CREATE TABLE waitlist_entry (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid REFERENCES doctor(id),
  specialty_id uuid REFERENCES specialty(id),
  preferred_from timestamptz,
  preferred_to timestamptz,
  status varchar(30) NOT NULL DEFAULT 'WAITING',
  priority smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (doctor_id IS NOT NULL OR specialty_id IS NOT NULL),
  CHECK (preferred_to IS NULL OR preferred_from IS NULL OR preferred_to > preferred_from)
);

CREATE INDEX idx_waitlist_open ON waitlist_entry(status, priority desc, created_at);

CREATE TABLE notification_outbox (
  id uuid PRIMARY KEY,
  aggregate_type varchar(50) NOT NULL,
  aggregate_id uuid NOT NULL,
  recipient_ref uuid,
  template_code varchar(80) NOT NULL,
  channel varchar(30),
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_notification_outbox_pending ON notification_outbox(status, next_attempt_at);
