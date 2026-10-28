-- Weekly range partitioning for high-volume operational and financial records.
-- This is an in-place cutover: schedule a maintenance window and take a verified backup.

ALTER TABLE appointment RENAME TO appointment_legacy;
ALTER TABLE encounter RENAME TO encounter_legacy;
ALTER TABLE receivable RENAME TO receivable_legacy;
ALTER TABLE payment RENAME TO payment_legacy;
ALTER TABLE exam_result RENAME TO exam_result_legacy;

-- Remove old foreign keys to the heap tables before replacing them with identity registries.
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT conrelid::regclass AS child_table, conname
      FROM pg_constraint
     WHERE contype = 'f'
       AND confrelid IN (
         'appointment_legacy'::regclass,
         'encounter_legacy'::regclass,
         'receivable_legacy'::regclass,
         'payment_legacy'::regclass,
         'exam_result_legacy'::regclass
       )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.child_table, fk.conname);
  END LOOP;
END $$;

CREATE TABLE appointment_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  status varchar(30) NOT NULL,
  UNIQUE (id, partition_timestamp)
);
CREATE INDEX idx_appointment_locator_patient_doctor ON appointment_locator(patient_id, doctor_id, status);

CREATE TABLE patient_first_completed_appointment (
  patient_id uuid PRIMARY KEY REFERENCES patient(id),
  appointment_id uuid NOT NULL UNIQUE REFERENCES appointment_locator(id),
  first_completed_at timestamptz NOT NULL
);
CREATE INDEX idx_patient_first_completed_date ON patient_first_completed_appointment(first_completed_at);

CREATE TABLE encounter_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  appointment_id uuid UNIQUE REFERENCES appointment_locator(id),
  UNIQUE (id, partition_timestamp)
);
CREATE INDEX idx_encounter_locator_patient_doctor ON encounter_locator(patient_id, doctor_id);
CREATE INDEX idx_encounter_locator_doctor_date ON encounter_locator(doctor_id, partition_timestamp DESC);

CREATE TABLE receivable_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  encounter_id uuid NOT NULL UNIQUE REFERENCES encounter_locator(id),
  UNIQUE (id, partition_timestamp)
);

CREATE TABLE exam_result_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  exam_order_id uuid NOT NULL UNIQUE REFERENCES exam_order(id),
  UNIQUE (id, partition_timestamp)
);

CREATE TABLE payment_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  receivable_id uuid NOT NULL REFERENCES receivable_locator(id),
  UNIQUE (id, partition_timestamp)
);
CREATE INDEX idx_payment_locator_receivable_date ON payment_locator(receivable_id, partition_timestamp);

CREATE TABLE prescription_locator (
  id uuid PRIMARY KEY,
  partition_timestamp timestamptz NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  encounter_id uuid REFERENCES encounter_locator(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  UNIQUE (id, partition_timestamp)
);
CREATE INDEX idx_prescription_locator_patient_date ON prescription_locator(patient_id, partition_timestamp DESC);

CREATE TABLE appointment (
  id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  modality varchar(30) NOT NULL DEFAULT 'PRESENCIAL',
  status varchar(30) NOT NULL,
  notes varchar(500),
  cancellation_reason varchar(250),
  confirmed_at timestamptz,
  checked_in_at timestamptz,
  created_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_weekly_pk PRIMARY KEY (id, starts_at),
  FOREIGN KEY (id, starts_at) REFERENCES appointment_locator(id, partition_timestamp),
  CHECK (ends_at > starts_at),
  CONSTRAINT chk_appointment_status CHECK (status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED','CANCELLED','NO_SHOW'))
) PARTITION BY RANGE (starts_at);

CREATE TABLE encounter (
  id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  appointment_id uuid REFERENCES appointment_locator(id),
  chief_complaint text,
  assessment text,
  plan text,
  status varchar(20) NOT NULL,
  version integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES app_user(id),
  CONSTRAINT encounter_weekly_pk PRIMARY KEY (id, started_at),
  FOREIGN KEY (id, started_at) REFERENCES encounter_locator(id, partition_timestamp),
  CONSTRAINT chk_encounter_status CHECK (status IN ('DRAFT','FINAL'))
) PARTITION BY RANGE (started_at);

CREATE TABLE receivable (
  id uuid NOT NULL,
  encounter_id uuid NOT NULL REFERENCES encounter_locator(id),
  payer_type varchar(30) NOT NULL,
  payer_reference varchar(120),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  status varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receivable_weekly_pk PRIMARY KEY (id, created_at),
  FOREIGN KEY (id, created_at) REFERENCES receivable_locator(id, partition_timestamp),
  CONSTRAINT chk_receivable_payer CHECK (payer_type IN ('PRIVATE','INSURANCE')),
  CONSTRAINT chk_receivable_status CHECK (status IN ('OPEN','PARTIAL','PAID'))
) PARTITION BY RANGE (created_at);

CREATE TABLE payment (
  id uuid NOT NULL,
  receivable_id uuid NOT NULL REFERENCES receivable_locator(id),
  amount numeric(12,2) NOT NULL CONSTRAINT chk_payment_positive CHECK (amount > 0),
  method varchar(30) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_weekly_pk PRIMARY KEY (id, paid_at),
  FOREIGN KEY (id, paid_at) REFERENCES payment_locator(id, partition_timestamp)
) PARTITION BY RANGE (paid_at);

CREATE TABLE exam_result (
  id uuid NOT NULL,
  exam_order_id uuid NOT NULL REFERENCES exam_order(id),
  storage_key varchar(500) NOT NULL,
  mime_type varchar(120) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_result_weekly_pk PRIMARY KEY (id, received_at),
  FOREIGN KEY (id, received_at) REFERENCES exam_result_locator(id, partition_timestamp)
) PARTITION BY RANGE (received_at);

-- Prescription storage is partition-ready; prescription issuance and digital signature
-- workflows remain outside the current application API.
CREATE TABLE prescription (
  id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patient(id),
  encounter_id uuid REFERENCES encounter_locator(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  status varchar(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','REVOKED')),
  valid_until date,
  instructions text,
  signed_at timestamptz,
  signature_reference varchar(200),
  document_storage_key varchar(500),
  created_by uuid REFERENCES app_user(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_weekly_pk PRIMARY KEY (id, issued_at),
  FOREIGN KEY (id, issued_at) REFERENCES prescription_locator(id, partition_timestamp)
) PARTITION BY RANGE (issued_at);

CREATE TABLE prescription_item (
  prescription_id uuid NOT NULL,
  issued_at timestamptz NOT NULL,
  item_number smallint NOT NULL CHECK (item_number > 0),
  medication_name varchar(180) NOT NULL,
  dosage varchar(120),
  route varchar(80),
  frequency varchar(120),
  duration varchar(120),
  quantity varchar(80),
  instructions text,
  CONSTRAINT prescription_item_weekly_pk PRIMARY KEY (prescription_id, issued_at, item_number),
  FOREIGN KEY (prescription_id, issued_at) REFERENCES prescription(id, issued_at)
) PARTITION BY RANGE (issued_at);

CREATE TABLE clinic_partition_week (
  week_start date PRIMARY KEY,
  provisioned_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ensure_clinic_week_partition(p_week date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_start date := date_trunc('week', p_week)::date;
  lower_bound timestamptz;
  upper_bound timestamptz;
  parent_name text;
  child_name text;
BEGIN
  lower_bound := v_week_start::timestamp AT TIME ZONE 'America/Sao_Paulo';
  upper_bound := (v_week_start + 7)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  INSERT INTO clinic_partition_week(week_start) VALUES (v_week_start)
  ON CONFLICT (week_start) DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  FOREACH parent_name IN ARRAY ARRAY[
    'appointment','encounter','receivable','payment','exam_result','prescription','prescription_item'
  ] LOOP
    child_name := parent_name || '_w' || to_char(v_week_start, 'YYYYMMDD');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
      child_name, parent_name, lower_bound, upper_bound
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION maintain_clinic_week_partitions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_week date := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  week_value date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('clinic_week_partitions'));
  week_value := current_week;
  WHILE week_value <= current_week + 182 LOOP
    PERFORM ensure_clinic_week_partition(week_value);
    week_value := week_value + 7;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION register_partitioned_clinic_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    CASE split_part(TG_TABLE_NAME, '_w', 1)
      WHEN 'appointment' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR
           NEW.patient_id IS DISTINCT FROM OLD.patient_id OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'encounter' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.started_at IS DISTINCT FROM OLD.started_at OR
           NEW.patient_id IS DISTINCT FROM OLD.patient_id OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id OR
           NEW.appointment_id IS DISTINCT FROM OLD.appointment_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'receivable' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at OR
           NEW.encounter_id IS DISTINCT FROM OLD.encounter_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'payment' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR
           NEW.receivable_id IS DISTINCT FROM OLD.receivable_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'exam_result' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.received_at IS DISTINCT FROM OLD.received_at OR
           NEW.exam_order_id IS DISTINCT FROM OLD.exam_order_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'prescription' THEN
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR
           NEW.patient_id IS DISTINCT FROM OLD.patient_id OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id OR
           NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
      WHEN 'prescription_item' THEN
        IF NEW.prescription_id IS DISTINCT FROM OLD.prescription_id OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR
           NEW.item_number IS DISTINCT FROM OLD.item_number THEN
          RAISE EXCEPTION 'Partition keys and relation identifiers are immutable.' USING ERRCODE = '23514';
        END IF;
    END CASE;
    RETURN NEW;
  END IF;

  IF split_part(TG_TABLE_NAME, '_w', 1) = 'appointment' THEN
    INSERT INTO appointment_locator(id, partition_timestamp, patient_id, doctor_id, status)
    VALUES (NEW.id, NEW.starts_at, NEW.patient_id, NEW.doctor_id, NEW.status)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN
      PERFORM 1 FROM appointment_locator WHERE id=NEW.id AND partition_timestamp=NEW.starts_at;
      IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de agendamento duplicado.' USING ERRCODE = '23505'; END IF;
    END IF;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'encounter' THEN
    INSERT INTO encounter_locator(id, partition_timestamp, patient_id, doctor_id, appointment_id)
    VALUES (NEW.id, NEW.started_at, NEW.patient_id, NEW.doctor_id, NEW.appointment_id)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN
      PERFORM 1 FROM encounter_locator WHERE id=NEW.id AND partition_timestamp=NEW.started_at;
      IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de consulta duplicado.' USING ERRCODE = '23505'; END IF;
    END IF;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'receivable' THEN
    INSERT INTO receivable_locator(id, partition_timestamp, encounter_id)
    VALUES (NEW.id, NEW.created_at, NEW.encounter_id)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN
      PERFORM 1 FROM receivable_locator WHERE id=NEW.id AND partition_timestamp=NEW.created_at;
      IF NOT FOUND THEN RAISE EXCEPTION 'Identificador financeiro duplicado.' USING ERRCODE = '23505'; END IF;
    END IF;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'payment' THEN
    INSERT INTO payment_locator(id, partition_timestamp, receivable_id)
    VALUES (NEW.id, NEW.paid_at, NEW.receivable_id)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN
      PERFORM 1 FROM payment_locator WHERE id=NEW.id AND partition_timestamp=NEW.paid_at;
      IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de pagamento duplicado.' USING ERRCODE = '23505'; END IF;
    END IF;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'exam_result' THEN
    INSERT INTO exam_result_locator(id, partition_timestamp, exam_order_id)
    VALUES (NEW.id, NEW.received_at, NEW.exam_order_id)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN
      PERFORM 1 FROM exam_result_locator WHERE id=NEW.id AND partition_timestamp=NEW.received_at;
      IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de resultado duplicado.' USING ERRCODE = '23505'; END IF;
    END IF;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'prescription' THEN
    INSERT INTO prescription_locator(id, partition_timestamp, patient_id, encounter_id, doctor_id)
    VALUES (NEW.id, NEW.issued_at, NEW.patient_id, NEW.encounter_id, NEW.doctor_id)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de prescrição duplicado.' USING ERRCODE = '23505'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_register_locator BEFORE INSERT OR UPDATE ON appointment
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE OR REPLACE FUNCTION sync_appointment_locator_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE appointment_locator SET status=NEW.status WHERE id=NEW.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_appointment_locator_status AFTER UPDATE OF status ON appointment
FOR EACH ROW EXECUTE FUNCTION sync_appointment_locator_status();
CREATE TRIGGER trg_encounter_register_locator BEFORE INSERT OR UPDATE ON encounter
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE TRIGGER trg_receivable_register_locator BEFORE INSERT OR UPDATE ON receivable
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE TRIGGER trg_payment_register_locator BEFORE INSERT OR UPDATE ON payment
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE TRIGGER trg_exam_result_register_locator BEFORE INSERT OR UPDATE ON exam_result
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE TRIGGER trg_prescription_register_locator BEFORE INSERT OR UPDATE ON prescription
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();
CREATE TRIGGER trg_prescription_item_partition_timestamp BEFORE UPDATE ON prescription_item
FOR EACH ROW EXECUTE FUNCTION register_partitioned_clinic_record();

CREATE OR REPLACE FUNCTION sync_appointment_reservation_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM appointment_reservation_guard WHERE appointment_id = OLD.id;
    DELETE FROM appointment_locator WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  IF NEW.status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE') THEN
    INSERT INTO appointment_reservation_guard(appointment_id, doctor_id, reserved_range)
    VALUES (NEW.id, NEW.doctor_id, tstzrange(NEW.starts_at, NEW.ends_at, '[)'))
    ON CONFLICT (appointment_id) DO UPDATE
      SET doctor_id = EXCLUDED.doctor_id, reserved_range = EXCLUDED.reserved_range;
  ELSE
    DELETE FROM appointment_reservation_guard WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE appointment_reservation_guard (
  appointment_id uuid PRIMARY KEY REFERENCES appointment_locator(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  reserved_range tstzrange NOT NULL,
  EXCLUDE USING gist (doctor_id WITH =, reserved_range WITH &&)
);

-- Provision partitions covering all historical rows and six months ahead before copying.
DO $$
DECLARE
  first_week date;
  last_week date;
  week_value date;
BEGIN
  SELECT min(week_start), max(week_start)
    INTO first_week, last_week
    FROM (
      SELECT date_trunc('week', starts_at AT TIME ZONE 'America/Sao_Paulo')::date AS week_start FROM appointment_legacy
      UNION ALL SELECT date_trunc('week', started_at AT TIME ZONE 'America/Sao_Paulo')::date FROM encounter_legacy
      UNION ALL SELECT date_trunc('week', created_at AT TIME ZONE 'America/Sao_Paulo')::date FROM receivable_legacy
      UNION ALL SELECT date_trunc('week', paid_at AT TIME ZONE 'America/Sao_Paulo')::date FROM payment_legacy
      UNION ALL SELECT date_trunc('week', received_at AT TIME ZONE 'America/Sao_Paulo')::date FROM exam_result_legacy
    ) event_weeks;
  first_week := least(coalesce(first_week, date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date),
                      date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date - 56);
  last_week := greatest(coalesce(last_week, first_week), date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date) + 182;
  week_value := first_week;
  WHILE week_value <= last_week LOOP
    PERFORM ensure_clinic_week_partition(week_value);
    week_value := week_value + 7;
  END LOOP;
END;
$$;

CREATE INDEX idx_appointment_weekly_patient_date ON appointment(patient_id, starts_at DESC);
CREATE INDEX idx_appointment_weekly_doctor_date ON appointment(doctor_id, starts_at);
CREATE INDEX idx_encounter_weekly_patient_date ON encounter(patient_id, started_at DESC);
CREATE INDEX idx_encounter_weekly_doctor_date ON encounter(doctor_id, started_at DESC);
CREATE INDEX idx_receivable_weekly_encounter_date ON receivable(encounter_id, created_at DESC);
CREATE INDEX idx_payment_weekly_receivable_date ON payment(receivable_id, paid_at DESC);
CREATE INDEX idx_exam_result_weekly_order_date ON exam_result(exam_order_id, received_at DESC);
CREATE INDEX idx_prescription_weekly_patient_date ON prescription(patient_id, issued_at DESC);

INSERT INTO appointment(id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,cancellation_reason,
  confirmed_at,checked_in_at,created_by,created_at,updated_at)
SELECT id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,cancellation_reason,
  confirmed_at,checked_in_at,created_by,created_at,updated_at FROM appointment_legacy;

INSERT INTO appointment_reservation_guard(appointment_id,doctor_id,reserved_range)
SELECT id,doctor_id,tstzrange(starts_at,ends_at,'[)')
  FROM appointment
 WHERE status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE');

INSERT INTO patient_first_completed_appointment(patient_id,appointment_id,first_completed_at)
SELECT DISTINCT ON (patient_id) patient_id,id,starts_at
  FROM appointment
 WHERE status='COMPLETED'
 ORDER BY patient_id,starts_at,id;

INSERT INTO encounter(id,patient_id,doctor_id,appointment_id,chief_complaint,assessment,plan,status,version,
  started_at,completed_at,created_by)
SELECT id,patient_id,doctor_id,appointment_id,chief_complaint,assessment,plan,status,version,
  started_at,completed_at,created_by FROM encounter_legacy;

INSERT INTO receivable(id,encounter_id,payer_type,payer_reference,amount,due_date,status,created_at)
SELECT id,encounter_id,payer_type,payer_reference,amount,due_date,status,created_at FROM receivable_legacy;

INSERT INTO payment(id,receivable_id,amount,method,paid_at)
SELECT id,receivable_id,amount,method,paid_at FROM payment_legacy;

INSERT INTO exam_result(id,exam_order_id,storage_key,mime_type,received_at)
SELECT id,exam_order_id,storage_key,mime_type,received_at FROM exam_result_legacy;

DROP TABLE appointment_legacy;
DROP TABLE encounter_legacy;
DROP TABLE receivable_legacy;
DROP TABLE payment_legacy;
DROP TABLE exam_result_legacy;

ALTER TABLE appointment_status_history
  ADD CONSTRAINT fk_appointment_history_locator FOREIGN KEY (appointment_id) REFERENCES appointment_locator(id);
ALTER TABLE encounter_addendum
  ADD CONSTRAINT fk_encounter_addendum_locator FOREIGN KEY (encounter_id) REFERENCES encounter_locator(id);
ALTER TABLE clinical_document
  ADD CONSTRAINT fk_clinical_document_encounter_locator FOREIGN KEY (encounter_id) REFERENCES encounter_locator(id);
ALTER TABLE exam_order
  ADD CONSTRAINT fk_exam_order_encounter_locator FOREIGN KEY (encounter_id) REFERENCES encounter_locator(id);
ALTER TABLE follow_up
  ADD CONSTRAINT fk_follow_up_encounter_locator FOREIGN KEY (encounter_id) REFERENCES encounter_locator(id);
ALTER TABLE result_review
  ADD CONSTRAINT fk_result_review_exam_result_locator FOREIGN KEY (exam_result_id) REFERENCES exam_result_locator(id);

CREATE TRIGGER trg_appointment_reservation_guard AFTER INSERT OR UPDATE OF doctor_id, starts_at, ends_at, status OR DELETE
ON appointment FOR EACH ROW EXECUTE FUNCTION sync_appointment_reservation_guard();

CREATE OR REPLACE FUNCTION cleanup_partitioned_clinic_locator()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF split_part(TG_TABLE_NAME, '_w', 1) = 'encounter' THEN
    DELETE FROM encounter_locator WHERE id=OLD.id;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'receivable' THEN
    DELETE FROM receivable_locator WHERE id=OLD.id;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'payment' THEN
    DELETE FROM payment_locator WHERE id=OLD.id;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'exam_result' THEN
    DELETE FROM exam_result_locator WHERE id=OLD.id;
  ELSIF split_part(TG_TABLE_NAME, '_w', 1) = 'prescription' THEN
    DELETE FROM prescription_locator WHERE id=OLD.id;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_encounter_locator_cleanup AFTER DELETE ON encounter
FOR EACH ROW EXECUTE FUNCTION cleanup_partitioned_clinic_locator();
CREATE TRIGGER trg_receivable_locator_cleanup AFTER DELETE ON receivable
FOR EACH ROW EXECUTE FUNCTION cleanup_partitioned_clinic_locator();
CREATE TRIGGER trg_payment_locator_cleanup AFTER DELETE ON payment
FOR EACH ROW EXECUTE FUNCTION cleanup_partitioned_clinic_locator();
CREATE TRIGGER trg_exam_result_locator_cleanup AFTER DELETE ON exam_result
FOR EACH ROW EXECUTE FUNCTION cleanup_partitioned_clinic_locator();
CREATE TRIGGER trg_prescription_locator_cleanup AFTER DELETE ON prescription
FOR EACH ROW EXECUTE FUNCTION cleanup_partitioned_clinic_locator();

CREATE OR REPLACE FUNCTION update_patient_first_completed_appointment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status='COMPLETED' THEN
    INSERT INTO patient_first_completed_appointment(patient_id,appointment_id,first_completed_at)
    VALUES (NEW.patient_id,NEW.id,NEW.starts_at)
    ON CONFLICT (patient_id) DO UPDATE
      SET appointment_id=EXCLUDED.appointment_id,first_completed_at=EXCLUDED.first_completed_at
      WHERE EXCLUDED.first_completed_at < patient_first_completed_appointment.first_completed_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_patient_first_completed AFTER INSERT OR UPDATE OF status ON appointment
FOR EACH ROW EXECUTE FUNCTION update_patient_first_completed_appointment();
