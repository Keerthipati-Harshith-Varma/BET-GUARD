-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  deposit_limit DECIMAL(10,2) DEFAULT 1000.00,
  play_time_limit INTEGER DEFAULT 2,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create transactions table
CREATE TABLE public.transactions (
  trans_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  trans_type TEXT NOT NULL CHECK (trans_type IN ('deposit', 'withdrawal', 'bet', 'win')),
  trans_time TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create audit_log table
CREATE TABLE public.audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  log_time TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "Users can view their own audit logs"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'player');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'player',
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policies using has_role function
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to validate daily deposit limit
CREATE OR REPLACE FUNCTION public.validate_deposit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Trigger for deposit limit validation
CREATE TRIGGER check_deposit_limit
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_deposit_limit();

-- Function to update balance after transaction
CREATE OR REPLACE FUNCTION public.update_balance()
RETURNS TRIGGER
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

-- Trigger for balance updates
CREATE TRIGGER update_balance_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_balance();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();