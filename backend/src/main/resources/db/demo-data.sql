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
LIMIT (SELECT greatest(0, 20 - count(*)) FROM patient);

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
           FROM appointment existing
           WHERE existing.doctor_id = c.doctor_id
             AND existing.id <> c.appointment_id
             AND existing.status IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CARE')
             AND tstzrange(existing.starts_at, existing.ends_at, '[)')
                 && tstzrange(c.starts_at, c.starts_at + interval '30 minutes', '[)')
       )
)
INSERT INTO appointment(id, patient_id, doctor_id, starts_at, ends_at, modality, status, notes)
SELECT appointment_id, patient_id, doctor_id, starts_at, starts_at + interval '30 minutes',
       CASE sequence_number % 3 WHEN 0 THEN 'TELEMEDICINA' WHEN 1 THEN 'PRESENCIAL' ELSE 'HIBRIDO' END,
       status,
       'DEMO-LOAD-1000 #' || lpad(sequence_number::text, 4, '0') || ' - carga para teste operacional'
FROM available_candidates
WHERE preference = 1
ON CONFLICT (id) DO NOTHING;
