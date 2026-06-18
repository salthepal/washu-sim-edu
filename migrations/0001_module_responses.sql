CREATE TABLE IF NOT EXISTS module_responses (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  learner_email TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(module_id, prompt_id, learner_email)
);

CREATE INDEX IF NOT EXISTS idx_module_responses_module_prompt
  ON module_responses(module_id, prompt_id);

CREATE INDEX IF NOT EXISTS idx_module_responses_learner
  ON module_responses(learner_email);
