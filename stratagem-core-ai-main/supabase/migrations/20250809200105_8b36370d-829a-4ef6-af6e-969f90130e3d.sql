-- Create invite_tokens table for gated signups
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  target_role public.app_role NOT NULL,
  subscription_tier text,
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Policies: only admins can manage/view invites
CREATE POLICY IF NOT EXISTS "Admins can view all invite tokens"
ON public.invite_tokens
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can insert invite tokens"
ON public.invite_tokens
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can update invite tokens"
ON public.invite_tokens
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can delete invite tokens"
ON public.invite_tokens
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger to auto-update updated_at
CREATE TRIGGER invite_tokens_set_updated_at
BEFORE UPDATE ON public.invite_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();