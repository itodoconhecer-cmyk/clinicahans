ALTER TABLE result_review
  ADD CONSTRAINT uq_result_review_exam_result UNIQUE (exam_result_id);

ALTER TABLE appointment
  ADD CONSTRAINT chk_appointment_status CHECK (status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED','CANCELLED','NO_SHOW'));

ALTER TABLE encounter
  ADD CONSTRAINT chk_encounter_status CHECK (status IN ('DRAFT','FINAL'));

ALTER TABLE allergy
  ADD CONSTRAINT chk_allergy_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'));

ALTER TABLE clinical_condition
  ADD CONSTRAINT chk_condition_status CHECK (status IN ('ACTIVE','CONTROLLED','RESOLVED'));

ALTER TABLE clinical_alert
  ADD CONSTRAINT chk_alert_severity CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL'));

ALTER TABLE exam_order
  ADD CONSTRAINT chk_exam_priority CHECK (priority IN ('ROUTINE','HIGH','URGENT')),
  ADD CONSTRAINT chk_exam_status CHECK (status IN ('REQUESTED','PERFORMED','RESULT_RECEIVED','REVIEWED','CANCELLED'));

ALTER TABLE follow_up
  ADD CONSTRAINT chk_followup_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  ADD CONSTRAINT chk_followup_status CHECK (status IN ('OPEN','CLOSED'));

ALTER TABLE receivable
  ADD CONSTRAINT chk_receivable_payer CHECK (payer_type IN ('PRIVATE','INSURANCE')),
  ADD CONSTRAINT chk_receivable_status CHECK (status IN ('OPEN','PARTIAL','PAID'));

ALTER TABLE payment
  DROP CONSTRAINT payment_amount_check,
  ADD CONSTRAINT chk_payment_positive CHECK (amount > 0);

ALTER TABLE waitlist_entry
  ADD CONSTRAINT chk_waitlist_status CHECK (status IN ('WAITING','RESOLVED'));
