-- Serialize concurrent startups and preserve existing registrations.
SELECT pg_advisory_xact_lock(739102641);

INSERT INTO doctor(id, full_name, crm, crm_state, status)
SELECT md5('clinicahans-demo-doctor-' || n)::uuid,
       CASE WHEN n = 1 THEN 'Dra Judite Ferreira'
            ELSE 'Medico Demonstracao ' || lpad(n::text, 2, '0') END,
       'DEMO-' || lpad(n::text, 4, '0'), 'SP', 'ACTIVE'
FROM generate_series(1, 10) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM doctor
    WHERE id = md5('clinicahans-demo-doctor-' || n)::uuid
       OR (crm = 'DEMO-' || lpad(n::text, 4, '0') AND crm_state = 'SP')
)
ORDER BY n
ON CONFLICT (crm, crm_state) DO NOTHING;

UPDATE doctor
SET full_name = 'Dra Judite Ferreira'
WHERE crm = 'DEMO-0001' AND crm_state = 'SP'
  AND full_name = 'Medico Demonstracao 01';

INSERT INTO patient(id, full_name, birth_date)
SELECT md5('clinicahans-demo-patient-' || n)::uuid,
       'Paciente Demonstracao ' || lpad(n::text, 2, '0'),
       make_date(1980 + n, 1, 1)
FROM generate_series(1, 20) AS n
WHERE NOT EXISTS (
    SELECT 1 FROM patient WHERE id = md5('clinicahans-demo-patient-' || n)::uuid
)
ORDER BY n
ON CONFLICT (id) DO NOTHING;

UPDATE patient SET insurance_card='DEMO-CARD-'||right(id::text, 8)
WHERE id IN (SELECT md5('clinicahans-demo-patient-'||n)::uuid FROM generate_series(1,20) n)
  AND insurance_card IS NULL;

INSERT INTO specialty(id, name)
SELECT md5('clinicahans-demo-specialty-' || lower(name))::uuid, name
FROM (VALUES
    ('Cardiologia'), ('Pediatria'), ('Dermatologia'), ('Ortopedia e traumatologia'), ('Ginecologia e obstetrícia'),
    ('Neurologia'), ('Oftalmologia'), ('Gastroenterologia'), ('Psiquiatria'), ('Endocrinologia e metabologia'),
    ('Pneumologia')
) AS demo_specialties(name)
ON CONFLICT (name) DO NOTHING;

WITH assignments(doctor_number, specialty_name, primary_specialty) AS (
    VALUES
      (1, 'Cardiologia', true),
      (2, 'Cardiologia', true), (2, 'Pediatria', false),
      (3, 'Cardiologia', true), (3, 'Dermatologia', false),
      (4, 'Pneumologia', true), (4, 'Ortopedia e traumatologia', false),
      (5, 'Ginecologia e obstetrícia', true),
      (6, 'Neurologia', true),
      (7, 'Oftalmologia', true),
      (8, 'Gastroenterologia', true),
      (9, 'Psiquiatria', true),
      (10, 'Endocrinologia e metabologia', true)
)
INSERT INTO doctor_specialty(doctor_id, specialty_id, primary_specialty)
SELECT d.id, s.id, a.primary_specialty
FROM assignments a
JOIN doctor d ON d.crm = 'DEMO-' || lpad(a.doctor_number::text, 4, '0') AND d.crm_state = 'SP'
JOIN specialty s ON s.name = a.specialty_name
ON CONFLICT (doctor_id, specialty_id) DO UPDATE
SET primary_specialty = EXCLUDED.primary_specialty;

INSERT INTO doctor_availability(id,doctor_id,weekday,starts_at,ends_at,slot_minutes,active)
SELECT md5('clinicahans-demo-availability-'||d.id||'-'||weekday||'-'||block)::uuid,
       d.id,weekday,
       CASE block WHEN 1 THEN time '09:00' ELSE time '13:00' END,
       CASE block WHEN 1 THEN time '12:00' ELSE time '17:00' END,
       30,true
FROM doctor d
CROSS JOIN generate_series(1,5) weekday
CROSS JOIN generate_series(1,2) block
WHERE d.crm LIKE 'DEMO-%'
  AND NOT EXISTS (SELECT 1 FROM doctor_availability av
    WHERE av.id=md5('clinicahans-demo-availability-'||d.id||'-'||weekday||'-'||block)::uuid);

INSERT INTO doctor_availability(id, doctor_id, weekday, starts_at, ends_at, slot_minutes, active)
SELECT md5('clinicahans-demo-availability-' || d.id || '-6-1')::uuid,
       d.id, 6, time '09:00', time '12:00', 30, true
FROM doctor d
WHERE d.crm = 'DEMO-0004' AND d.crm_state = 'SP'
  AND NOT EXISTS (
      SELECT 1 FROM doctor_availability av
      WHERE av.id = md5('clinicahans-demo-availability-' || d.id || '-6-1')::uuid
  );

-- 1,000 deterministic appointments, spread over 100 business days and all
-- demo doctors/patients. IDs and notes make repeated dev startups idempotent.
WITH workdays AS (
    SELECT service_date,
           row_number() OVER (ORDER BY service_date)::integer AS day_number
    FROM (
        SELECT generated_day::date AS service_date
        FROM generate_series((current_date - 40)::timestamp,
                             (current_date + 220)::timestamp,
                             interval '1 day') AS generated_day
        WHERE extract(isodow FROM generated_day) BETWEEN 1 AND 5
        ORDER BY generated_day
        LIMIT 100
    ) available_days
),
demo_doctors AS (
    SELECT id, right(crm, 4)::integer AS doctor_number
    FROM doctor
    WHERE crm ~ '^DEMO-[0-9]{4}$' AND crm_state = 'SP'
),
demo_patients AS (
    SELECT id,
           row_number() OVER (ORDER BY full_name)::integer AS patient_number
    FROM patient
    WHERE full_name LIKE 'Paciente Demonstracao %'
),
base_appointments AS (
    SELECT n AS sequence_number,
           md5('clinicahans-demo-appointment-' || n)::uuid AS appointment_id,
           wd.service_date,
           d.id AS doctor_id,
           p.id AS patient_id,
           CASE
             WHEN wd.service_date < current_date THEN
               CASE n % 10 WHEN 0 THEN 'CANCELLED' WHEN 1 THEN 'NO_SHOW' ELSE 'COMPLETED' END
             WHEN wd.service_date = current_date THEN
               CASE n % 5 WHEN 0 THEN 'SCHEDULED' WHEN 1 THEN 'CONFIRMED'
                          WHEN 2 THEN 'CHECKED_IN' WHEN 3 THEN 'IN_CARE' ELSE 'CANCELLED' END
             ELSE
               CASE WHEN n % 10 IN (0, 1) THEN 'CANCELLED'
                    WHEN n % 10 IN (2, 3, 4, 5, 6) THEN 'SCHEDULED'
                    ELSE 'CONFIRMED' END
           END AS status
    FROM generate_series(1, 1000) AS n
    JOIN workdays wd ON wd.day_number = ((n - 1) / 10) + 1
    JOIN demo_doctors d ON d.doctor_number = ((n - 1) % 10) + 1
    JOIN demo_patients p ON p.patient_number = ((n * 7 - 1) % 20) + 1
),
slot_candidates AS (
    SELECT b.*,
           ((b.sequence_number + attempt * 5) % 14) AS slot_number,
           attempt
    FROM base_appointments b
    CROSS JOIN generate_series(0, 13) AS attempt
),
timed_candidates AS (
    SELECT c.*,
           ((c.service_date + CASE WHEN c.slot_number < 6
               THEN time '09:00' + c.slot_number * interval '30 minutes'
               ELSE time '13:00' + (c.slot_number - 6) * interval '30 minutes'
             END) AT TIME ZONE 'America/Sao_Paulo') AS starts_at
    FROM slot_candidates c
),
available_candidates AS (
    SELECT c.*,
           row_number() OVER (PARTITION BY c.sequence_number ORDER BY c.attempt) AS preference
    FROM timed_candidates c
    WHERE c.status NOT IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CARE')
       OR NOT EXISTS (
           SELECT 1
           FROM appointment_reservation_guard existing
           WHERE existing.doctor_id = c.doctor_id
             AND existing.appointment_id <> c.appointment_id
             AND existing.reserved_range && tstzrange(c.starts_at, c.starts_at + interval '30 minutes', '[)')
       )
)
INSERT INTO appointment(id, patient_id, doctor_id, starts_at, ends_at, modality, status, notes, created_at)
SELECT appointment_id, patient_id, doctor_id, starts_at, starts_at + interval '30 minutes',
       CASE sequence_number % 3 WHEN 0 THEN 'TELEMEDICINA' WHEN 1 THEN 'PRESENCIAL' ELSE 'HIBRIDO' END,
       status,
       'DEMO-LOAD-1000 #' || lpad(sequence_number::text, 4, '0') || ' - carga para teste operacional',
       starts_at - (1 + sequence_number % 14) * interval '1 day'
FROM available_candidates
WHERE preference = 1
  AND NOT EXISTS (SELECT 1 FROM appointment_locator existing WHERE existing.id = appointment_id)
ON CONFLICT (id, starts_at) DO NOTHING;

-- Eight complete preceding weeks, 60 finished synthetic consultations per
-- week. Week/date-based IDs make the load repeatable as time advances.
-- The hash-derived selections vary the modality, patient and amount while
-- keeping the same results when the application restarts.
SELECT ensure_clinic_week_partition(
    date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date - n * 7
) FROM generate_series(1, 8) AS n;

WITH weeks AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date - n * 7 AS week_start
    FROM generate_series(1, 8) AS n
), samples AS (
    SELECT w.week_start, n,
           w.week_start + ((n - 1) / 12) AS service_date,
           md5('clinicahans-demo-consultation-' || w.week_start || '-' || n)::uuid AS appointment_id,
           md5(w.week_start || '-' || n) AS sample_hash
    FROM weeks w CROSS JOIN generate_series(1, 60) AS n
)
INSERT INTO appointment(id, patient_id, doctor_id, starts_at, ends_at, modality, status, notes, created_at)
SELECT s.appointment_id, p.id, d.id,
       (s.service_date + time '09:00' + ((s.n - 1) % 12 / 10) * interval '30 minutes') AT TIME ZONE 'America/Sao_Paulo',
       (s.service_date + time '09:30' + ((s.n - 1) % 12 / 10) * interval '30 minutes') AT TIME ZONE 'America/Sao_Paulo',
       CASE (get_byte(decode(s.sample_hash, 'hex'), 0) % 3)
          WHEN 0 THEN 'PRESENCIAL' WHEN 1 THEN 'TELEMEDICINA' ELSE 'HIBRIDO' END,
       'COMPLETED', 'DEMO-CONSULTATION-REPORTS - registro ficticio',
       ((s.service_date + time '09:00' + ((s.n - 1) % 12 / 10) * interval '30 minutes') AT TIME ZONE 'America/Sao_Paulo')
           - (1 + get_byte(decode(s.sample_hash, 'hex'), 2) % 14) * interval '1 day'
FROM samples s
JOIN doctor d ON d.id = md5('clinicahans-demo-doctor-' || (((s.n - 1) % 12 % 10) + 1))::uuid
JOIN patient p ON p.id = md5('clinicahans-demo-patient-' || ((get_byte(decode(s.sample_hash, 'hex'), 1) % 20) + 1))::uuid
ON CONFLICT (id, starts_at) DO NOTHING;

INSERT INTO encounter(id, patient_id, doctor_id, appointment_id, chief_complaint, assessment, plan, status, started_at, completed_at)
SELECT md5('clinicahans-demo-encounter-' || a.id)::uuid, a.patient_id, a.doctor_id, a.id,
       'Consulta demonstrativa', 'Informacoes ficticias para relatorios', 'Acompanhamento demonstrativo',
       'FINAL', a.starts_at, a.ends_at
FROM appointment a
WHERE a.notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio'
  AND NOT EXISTS (SELECT 1 FROM encounter_locator e WHERE e.appointment_id = a.id)
ON CONFLICT (id, started_at) DO NOTHING;

INSERT INTO receivable(id, encounter_id, payer_type, payer_reference, amount, due_date, status, created_at)
SELECT md5('clinicahans-demo-receivable-' || e.id)::uuid, e.id,
       CASE WHEN get_byte(decode(md5(e.id::text), 'hex'), 0) % 2 = 0 THEN 'PRIVATE' ELSE 'INSURANCE' END,
       'DEMONSTRACAO', 100 + get_byte(decode(md5(e.id::text), 'hex'), 1),
       (e.started_at AT TIME ZONE 'America/Sao_Paulo')::date,
       CASE WHEN get_byte(decode(md5(e.id::text), 'hex'), 2) % 4 = 0 THEN 'OPEN' ELSE 'PAID' END,
       e.started_at
FROM encounter e
JOIN appointment_locator a ON a.id = e.appointment_id
JOIN appointment ap ON ap.id = a.id AND ap.starts_at = a.partition_timestamp
WHERE ap.notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio'
  AND NOT EXISTS (SELECT 1 FROM receivable_locator r WHERE r.id = md5('clinicahans-demo-receivable-' || e.id)::uuid)
ON CONFLICT (id, created_at) DO NOTHING;

INSERT INTO payment(id, receivable_id, amount, method, paid_at)
SELECT md5('clinicahans-demo-payment-' || r.id)::uuid, r.id, r.amount,
       CASE get_byte(decode(md5(r.id::text), 'hex'), 0) % 3
         WHEN 0 THEN 'PIX' WHEN 1 THEN 'CARD' ELSE 'CASH' END,
       r.created_at + interval '15 minutes'
FROM receivable r
JOIN encounter_locator e ON e.id = r.encounter_id
JOIN appointment_locator a ON a.id = e.appointment_id
JOIN appointment ap ON ap.id = a.id AND ap.starts_at = a.partition_timestamp
WHERE ap.notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio' AND r.status = 'PAID'
  AND NOT EXISTS (SELECT 1 FROM payment_locator p WHERE p.id = md5('clinicahans-demo-payment-' || r.id)::uuid)
ON CONFLICT (id, paid_at) DO NOTHING;

-- Disabled technical identity owns only fictitious requests; it cannot log in.
INSERT INTO app_user(id, username, password_hash, active)
VALUES (md5('clinicahans-demo-disabled-user')::uuid, 'demo-disabled-service', '!disabled-demonstration', false)
ON CONFLICT DO NOTHING;

INSERT INTO exam_order(id, patient_id, encounter_id, requested_by, exam_name, priority, status, expected_by, created_at)
SELECT md5('clinicahans-demo-exam-' || e.id)::uuid, e.patient_id, e.id, u.id,
       'Exame ficticio', 'ROUTINE',
       CASE WHEN get_byte(decode(md5(e.id::text), 'hex'), 4) % 4 = 0 THEN 'REVIEWED' ELSE 'REQUESTED' END,
       (e.started_at AT TIME ZONE 'America/Sao_Paulo')::date + 7, e.started_at
FROM encounter e JOIN app_user u ON u.id = md5('clinicahans-demo-disabled-user')::uuid
JOIN appointment_locator al ON al.id = e.appointment_id
JOIN appointment ap ON ap.id = al.id AND ap.starts_at = al.partition_timestamp
WHERE ap.notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio'
  AND get_byte(decode(md5(e.id::text), 'hex'), 3) % 6 = 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO follow_up(id, patient_id, encounter_id, owner_user_id, reason, priority, status, due_at, created_at)
SELECT md5('clinicahans-demo-followup-' || e.id)::uuid, e.patient_id, e.id, u.id,
       'Acompanhamento ficticio', 'MEDIUM',
       CASE WHEN get_byte(decode(md5(e.id::text), 'hex'), 6) % 4 = 0 THEN 'CLOSED' ELSE 'OPEN' END,
       e.started_at + interval '14 days', e.started_at
FROM encounter e JOIN app_user u ON u.id = md5('clinicahans-demo-disabled-user')::uuid
JOIN appointment_locator al ON al.id = e.appointment_id
JOIN appointment ap ON ap.id = al.id AND ap.starts_at = al.partition_timestamp
WHERE ap.notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio'
  AND get_byte(decode(md5(e.id::text), 'hex'), 5) % 6 = 0
ON CONFLICT (id) DO NOTHING;

-- Repair timestamps from older demo loads, restricted to marked synthetic rows.
UPDATE appointment
SET created_at = starts_at - (1 + get_byte(decode(md5(id::text), 'hex'), 0) % 14) * interval '1 day'
WHERE (notes LIKE 'DEMO-LOAD-1000 #% - carga para teste operacional'
       OR notes = 'DEMO-CONSULTATION-REPORTS - registro ficticio')
  AND created_at > starts_at;
