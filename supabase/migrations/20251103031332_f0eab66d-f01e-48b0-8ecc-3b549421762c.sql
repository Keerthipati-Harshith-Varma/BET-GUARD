-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.update_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trans_type IN ('deposit', 'win') THEN
    UPDATE public.profiles
    SET balance = balance + NEW.amount
    WHERE id = NEW.user_id;
  ELSIF NEW.trans_type IN ('withdrawal', 'bet') THEN
    UPDATE public.profiles
    SET balance = balance - NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;