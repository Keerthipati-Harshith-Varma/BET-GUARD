-- Add ban status and tracking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create player behavior tracking table
CREATE TABLE IF NOT EXISTS public.player_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  total_bets DECIMAL(10,2) DEFAULT 0,
  total_wins DECIMAL(10,2) DEFAULT 0,
  total_losses DECIMAL(10,2) DEFAULT 0,
  games_played JSONB DEFAULT '[]'::jsonb,
  suspicious_activity BOOLEAN DEFAULT false,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_behavior ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_behavior
CREATE POLICY "Admins can view all behavior data"
ON public.player_behavior
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own behavior"
ON public.player_behavior
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior"
ON public.player_behavior
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to track player activity
CREATE OR REPLACE FUNCTION public.track_player_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last login on profile
  UPDATE public.profiles
  SET last_login = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger for tracking
CREATE TRIGGER on_transaction_track_activity
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.track_player_activity();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_player_behavior_user_id ON public.player_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login);