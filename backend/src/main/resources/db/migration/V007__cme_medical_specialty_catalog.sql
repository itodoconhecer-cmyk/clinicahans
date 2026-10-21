-- Canonical specialty names follow Portaria CME 01/2024, approved by CFM Resolution 2.380/2024.
-- Preserve existing doctor links while bringing legacy labels to the official names.
WITH aliases(alias_name, canonical_name) AS (VALUES
  ('Ginecologia', 'Ginecologia e obstetrícia'),
  ('Endocrinologia', 'Endocrinologia e metabologia'),
  ('Ortopedia', 'Ortopedia e traumatologia'),
  ('Medicina legal', 'Medicina legal e perícia médica')
), pairs AS (
  SELECT old_specialty.id AS alias_id, canonical_specialty.id AS canonical_id
  FROM aliases a
  JOIN specialty old_specialty ON lower(old_specialty.name) = lower(a.alias_name)
  JOIN specialty canonical_specialty ON lower(canonical_specialty.name) = lower(a.canonical_name)
)
INSERT INTO doctor_specialty(doctor_id, specialty_id, primary_specialty)
SELECT links.doctor_id, pairs.canonical_id, links.primary_specialty
FROM doctor_specialty links
JOIN pairs ON pairs.alias_id = links.specialty_id
ON CONFLICT (doctor_id, specialty_id) DO UPDATE
SET primary_specialty = doctor_specialty.primary_specialty OR EXCLUDED.primary_specialty;

WITH aliases(alias_name, canonical_name) AS (VALUES
  ('Ginecologia', 'Ginecologia e obstetrícia'),
  ('Endocrinologia', 'Endocrinologia e metabologia'),
  ('Ortopedia', 'Ortopedia e traumatologia'),
  ('Medicina legal', 'Medicina legal e perícia médica')
), pairs AS (
  SELECT old_specialty.id AS alias_id, canonical_specialty.id AS canonical_id
  FROM aliases a
  JOIN specialty old_specialty ON lower(old_specialty.name) = lower(a.alias_name)
  JOIN specialty canonical_specialty ON lower(canonical_specialty.name) = lower(a.canonical_name)
)
DELETE FROM doctor_specialty links USING pairs WHERE links.specialty_id = pairs.alias_id;

WITH aliases(alias_name, canonical_name) AS (VALUES
  ('Ginecologia', 'Ginecologia e obstetrícia'),
  ('Endocrinologia', 'Endocrinologia e metabologia'),
  ('Ortopedia', 'Ortopedia e traumatologia'),
  ('Medicina legal', 'Medicina legal e perícia médica')
), pairs AS (
  SELECT old_specialty.id AS alias_id
  FROM aliases a
  JOIN specialty old_specialty ON lower(old_specialty.name) = lower(a.alias_name)
  JOIN specialty canonical_specialty ON lower(canonical_specialty.name) = lower(a.canonical_name)
)
DELETE FROM specialty old_specialty USING pairs WHERE old_specialty.id = pairs.alias_id;

WITH aliases(alias_name, canonical_name) AS (VALUES
  ('Ginecologia', 'Ginecologia e obstetrícia'),
  ('Endocrinologia', 'Endocrinologia e metabologia'),
  ('Ortopedia', 'Ortopedia e traumatologia'),
  ('Medicina legal', 'Medicina legal e perícia médica')
)
UPDATE specialty old_specialty
SET name = aliases.canonical_name,
    external_system = coalesce(old_specialty.external_system, 'CFM_CME')
FROM aliases
WHERE lower(old_specialty.name) = lower(aliases.alias_name)
  AND NOT EXISTS (
    SELECT 1 FROM specialty canonical_specialty
    WHERE lower(canonical_specialty.name) = lower(aliases.canonical_name)
  );

INSERT INTO specialty(id, name, external_system)
SELECT md5('clinicahans-cme-2024-' || lower(name))::uuid, name, 'CFM_CME'
FROM (VALUES
  ('Acupuntura'), ('Alergia e imunologia'), ('Anestesiologia'), ('Angiologia'), ('Cardiologia'),
  ('Cirurgia cardiovascular'), ('Cirurgia da mão'), ('Cirurgia de cabeça e pescoço'),
  ('Cirurgia do aparelho digestivo'), ('Cirurgia geral'), ('Cirurgia oncológica'),
  ('Cirurgia pediátrica'), ('Cirurgia plástica'), ('Cirurgia torácica'), ('Cirurgia vascular'),
  ('Clínica médica'), ('Coloproctologia'), ('Dermatologia'), ('Endocrinologia e metabologia'),
  ('Endoscopia'), ('Gastroenterologia'), ('Genética médica'), ('Geriatria'),
  ('Ginecologia e obstetrícia'), ('Hematologia e hemoterapia'), ('Homeopatia'), ('Infectologia'),
  ('Mastologia'), ('Medicina de emergência'), ('Medicina de família e comunidade'),
  ('Medicina do trabalho'), ('Medicina do tráfego'), ('Medicina esportiva'),
  ('Medicina física e reabilitação'), ('Medicina intensiva'), ('Medicina legal e perícia médica'),
  ('Medicina nuclear'), ('Medicina preventiva e social'), ('Nefrologia'), ('Neurocirurgia'),
  ('Neurologia'), ('Nutrologia'), ('Oftalmologia'), ('Oncologia clínica'),
  ('Ortopedia e traumatologia'), ('Otorrinolaringologia'), ('Patologia'),
  ('Patologia clínica/medicina laboratorial'), ('Pediatria'), ('Pneumologia'), ('Psiquiatria'),
  ('Radiologia e diagnóstico por imagem'), ('Radioterapia'), ('Reumatologia'), ('Urologia')
) AS cme_specialties(name)
ON CONFLICT (name) DO UPDATE
SET external_system = coalesce(specialty.external_system, EXCLUDED.external_system);
