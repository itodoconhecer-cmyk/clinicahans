ALTER TABLE doctor
  ADD COLUMN user_id uuid UNIQUE REFERENCES app_user(id);

CREATE INDEX idx_doctor_user_id ON doctor(user_id);
