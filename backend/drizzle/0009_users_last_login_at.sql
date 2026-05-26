ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login_at timestamp;

CREATE INDEX IF NOT EXISTS idx_users_last_login_at
ON users (last_login_at);
