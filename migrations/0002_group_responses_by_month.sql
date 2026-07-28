ALTER TABLE module_responses ADD COLUMN response_month TEXT;

UPDATE module_responses
SET response_month = substr(created_at, 1, 7)
WHERE response_month IS NULL;

CREATE INDEX IF NOT EXISTS idx_module_responses_month
  ON module_responses(response_month, module_id, prompt_id);
