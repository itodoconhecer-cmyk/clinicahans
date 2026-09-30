CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE role (
  id uuid PRIMARY KEY,
  code varchar(40) NOT NULL UNIQUE
);

CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  username varchar(120) NOT NULL UNIQUE,
  password_hash varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_role (
  user_id uuid NOT NULL REFERENCES app_user(id),
  role_id uuid NOT NULL REFERENCES role(id),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO role(id, code) VALUES
  ('00000000-0000-0000-0000-000000000001','ADMIN'),
  ('00000000-0000-0000-0000-000000000002','MEDICO'),
  ('00000000-0000-0000-0000-000000000003','RECEPCAO'),
  ('00000000-0000-0000-0000-000000000004','GESTAO')
ON CONFLICT DO NOTHING;

CREATE TABLE patient (
  id uuid PRIMARY KEY,
  full_name varchar(180) NOT NULL,
  cpf varchar(14) UNIQUE,
  birth_date date NOT NULL,
  phone varchar(30),
  email varchar(180),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_patient_name ON patient(lower(full_name));
CREATE INDEX idx_patient_phone ON patient(phone);

CREATE TABLE doctor (
  id uuid PRIMARY KEY,
  full_name varchar(180) NOT NULL,
  cpf varchar(14) UNIQUE,
  crm varchar(30) NOT NULL,
  crm_state char(2) NOT NULL,
  rqe varchar(30),
  phone varchar(30),
  email varchar(180),
  status varchar(20) NOT NULL,
  default_appointment_minutes integer NOT NULL DEFAULT 30 CHECK (default_appointment_minutes between 5 and 480),
  modality varchar(30) NOT NULL DEFAULT 'PRESENCIAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crm, crm_state)
);

CREATE TABLE specialty (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL UNIQUE,
  external_system varchar(40),
  external_code varchar(80)
);

CREATE TABLE doctor_specialty (
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  specialty_id uuid NOT NULL REFERENCES specialty(id),
  primary_specialty boolean NOT NULL DEFAULT false,
  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE TABLE doctor_availability (
  id uuid PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  weekday smallint NOT NULL CHECK (weekday between 1 and 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  slot_minutes integer NOT NULL CHECK (slot_minutes between 5 and 480),
  active boolean NOT NULL DEFAULT true,
  CHECK (ends_at > starts_at)
);

CREATE TABLE schedule_block (
  id uuid PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason varchar(250),
  CHECK (ends_at > starts_at)
);

CREATE TABLE appointment (
  id uuid PRIMARY KEY,
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
  CHECK (ends_at > starts_at)
);

ALTER TABLE appointment ADD CONSTRAINT ex_appointment_doctor_overlap
EXCLUDE USING gist (
  doctor_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE'));

CREATE INDEX idx_appointment_patient_date ON appointment(patient_id, starts_at DESC);
CREATE INDEX idx_appointment_doctor_date ON appointment(doctor_id, starts_at);

CREATE TABLE appointment_status_history (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES appointment(id),
  from_status varchar(30),
  to_status varchar(30) NOT NULL,
  changed_by uuid REFERENCES app_user(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason varchar(250)
);

CREATE TABLE encounter (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  doctor_id uuid NOT NULL REFERENCES doctor(id),
  appointment_id uuid UNIQUE REFERENCES appointment(id),
  chief_complaint text,
  assessment text,
  plan text,
  status varchar(20) NOT NULL,
  version integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES app_user(id)
);

CREATE TABLE encounter_addendum (
  id uuid PRIMARY KEY,
  encounter_id uuid NOT NULL REFERENCES encounter(id),
  author_user_id uuid NOT NULL REFERENCES app_user(id),
  reason text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE allergy (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  substance varchar(180) NOT NULL,
  reaction text,
  severity varchar(20) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  recorded_by uuid REFERENCES app_user(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_allergy_patient_active ON allergy(patient_id, active);

CREATE TABLE medication (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  name varchar(180) NOT NULL,
  dosage varchar(120),
  frequency varchar(120),
  started_on date,
  ended_on date,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE clinical_condition (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  description varchar(300) NOT NULL,
  status varchar(30) NOT NULL,
  onset_date date
);

CREATE TABLE clinical_alert (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  alert_type varchar(40) NOT NULL,
  severity varchar(20) NOT NULL,
  source_type varchar(40) NOT NULL,
  source_id uuid,
  message varchar(300) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_alert_patient ON clinical_alert(patient_id, active, severity);

CREATE TABLE clinical_document (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  encounter_id uuid REFERENCES encounter(id),
  document_type varchar(50) NOT NULL,
  storage_key varchar(500) NOT NULL,
  mime_type varchar(120) NOT NULL,
  checksum varchar(128),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE exam_order (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  encounter_id uuid REFERENCES encounter(id),
  requested_by uuid NOT NULL REFERENCES app_user(id),
  exam_name varchar(220) NOT NULL,
  priority varchar(20) NOT NULL DEFAULT 'ROUTINE',
  status varchar(30) NOT NULL,
  expected_by date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exam_order_pending ON exam_order(status, expected_by);

CREATE TABLE exam_result (
  id uuid PRIMARY KEY,
  exam_order_id uuid NOT NULL UNIQUE REFERENCES exam_order(id),
  storage_key varchar(500) NOT NULL,
  mime_type varchar(120) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE result_review (
  id uuid PRIMARY KEY,
  exam_result_id uuid NOT NULL REFERENCES exam_result(id),
  reviewed_by uuid NOT NULL REFERENCES app_user(id),
  note text,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE follow_up (
  id uuid PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patient(id),
  encounter_id uuid REFERENCES encounter(id),
  owner_user_id uuid NOT NULL REFERENCES app_user(id),
  reason varchar(500) NOT NULL,
  priority varchar(20) NOT NULL,
  status varchar(30) NOT NULL,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX idx_follow_up_queue ON follow_up(status, priority, due_at);

CREATE TABLE follow_up_action (
  id uuid PRIMARY KEY,
  follow_up_id uuid NOT NULL REFERENCES follow_up(id),
  actor_user_id uuid NOT NULL REFERENCES app_user(id),
  action_type varchar(40) NOT NULL,
  note varchar(1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receivable (
  id uuid PRIMARY KEY,
  encounter_id uuid NOT NULL UNIQUE REFERENCES encounter(id),
  payer_type varchar(30) NOT NULL,
  payer_reference varchar(120),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date,
  status varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment (
  id uuid PRIMARY KEY,
  receivable_id uuid NOT NULL REFERENCES receivable(id),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  method varchar(30) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_event (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id),
  username varchar(120),
  action varchar(80) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id varchar(120),
  correlation_id varchar(120),
  source_ip inet,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_event_entity ON audit_event(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_event_user ON audit_event(user_id, occurred_at DESC);
