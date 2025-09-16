CREATE OR REPLACE FUNCTION increment_token_usage(user_id_param uuid, tokens integer)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET token_usage = token_usage + tokens
  WHERE id = user_id_param;
END;
$$;