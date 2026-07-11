CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'setup',
  current_round INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  competition_id TEXT REFERENCES competitions(id),
  round_number INTEGER NOT NULL,
  emoji_clue TEXT NOT NULL,
  correct_answers TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TEXT,
  ended_at TEXT,
  random_seed TEXT
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  competition_id TEXT REFERENCES competitions(id),
  roll_number TEXT NOT NULL,
  socket_id TEXT,
  session_token TEXT UNIQUE NOT NULL,
  registered_at TEXT DEFAULT (datetime('now')),
  current_status TEXT DEFAULT 'active',
  UNIQUE(competition_id, roll_number)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id),
  round_id TEXT REFERENCES rounds(id),
  answer TEXT NOT NULL,
  is_correct INTEGER DEFAULT 0,
  submitted_at TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  server_received_at TEXT DEFAULT (datetime('now')),
  is_late INTEGER DEFAULT 0,
  UNIQUE(participant_id, round_id)
);

CREATE TABLE IF NOT EXISTS qualifications (
  id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id),
  round_id TEXT REFERENCES rounds(id),
  qualified INTEGER NOT NULL,
  qualification_reason TEXT,
  override_by_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT REFERENCES admins(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_round ON qualifications(round_id);
CREATE INDEX IF NOT EXISTS idx_participants_competition ON participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_participants_roll ON participants(roll_number, competition_id);
