-- Accelerates date-window scans for occupied calendar events.
CREATE INDEX idx_appointment_calendar_active_start
  ON appointment(starts_at)
  WHERE status IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED');
