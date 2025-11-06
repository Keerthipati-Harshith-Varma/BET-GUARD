-- Fix search_path for validate_deposit_limit function
CREATE OR REPLACE FUNCTION public.validate_deposit_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_today DECIMAL(10,2);
  user_limit DECIMAL(10,2);
BEGIN
  -- Only check for deposits
  IF NEW.trans_type = 'deposit' THEN
    -- Get user's deposit limit
    SELECT deposit_limit INTO user_limit
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Calculate total deposits today
    SELECT COALESCE(SUM(amount), 0) INTO total_today
    FROM public.transactions
    WHERE user_id = NEW.user_id 
      AND trans_type = 'deposit'
      AND DATE(trans_time) = CURRENT_DATE;
    
    -- Check if new deposit would exceed limit
    IF total_today + NEW.amount > user_limit THEN
      RAISE EXCEPTION 'Daily deposit limit of ₹% exceeded! Current: ₹%, Attempted: ₹%', 
        user_limit, total_today, NEW.amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;