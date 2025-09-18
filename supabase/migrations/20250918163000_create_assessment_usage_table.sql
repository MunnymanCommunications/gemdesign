CREATE TABLE assessment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  last_reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessment_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON assessment_usage
  FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON assessment_usage
  FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON assessment_usage
  FOR UPDATE
    USING (auth.uid() = user_id);