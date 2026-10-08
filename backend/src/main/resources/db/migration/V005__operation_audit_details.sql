ALTER TABLE audit_event
  ADD COLUMN request_method varchar(10),
  ADD COLUMN request_path varchar(512),
  ADD COLUMN resource_identifiers jsonb,
  ADD COLUMN http_status integer,
  ADD COLUMN duration_ms bigint,
  ADD COLUMN outcome varchar(20),
  ADD COLUMN previous_values jsonb;

CREATE INDEX idx_audit_event_request
  ON audit_event(occurred_at DESC)
  WHERE action = 'API_REQUEST';
