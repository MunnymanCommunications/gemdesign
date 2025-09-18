CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_tier TEXT NOT NULL UNIQUE,
  limit_value INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin to manage limits" ON usage_limits
  FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

INSERT INTO usage_limits (subscription_tier, limit_value) VALUES ('base', 10);
INSERT INTO usage_limits (subscription_tier, limit_value) VALUES ('pro', 50);