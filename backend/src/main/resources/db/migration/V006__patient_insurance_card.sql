ALTER TABLE patient ADD COLUMN insurance_card varchar(40);
CREATE UNIQUE INDEX uq_patient_insurance_card ON patient(insurance_card) WHERE insurance_card IS NOT NULL;
