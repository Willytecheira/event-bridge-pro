
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- processed_events table
CREATE TABLE public.processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_event_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'bridgewise',
  external_topic TEXT NOT NULL DEFAULT 'alerts-reasoning-external',
  raw_payload_json JSONB,
  normalized_payload_json JSONB,
  event_type TEXT,
  ticker TEXT,
  asset_type TEXT,
  sentiment TEXT,
  event_date_utc TIMESTAMPTZ,
  has_reasoning BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'processed',
  published_to_internal_kafka BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view events" ON public.processed_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage events" ON public.processed_events
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_events_ticker ON public.processed_events(ticker);
CREATE INDEX idx_events_type ON public.processed_events(event_type);
CREATE INDEX idx_events_sentiment ON public.processed_events(sentiment);
CREATE INDEX idx_events_created ON public.processed_events(created_at DESC);

-- processing_errors table
CREATE TABLE public.processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL,
  unique_event_id TEXT,
  raw_payload_text TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  status TEXT NOT NULL DEFAULT 'unresolved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.processing_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view errors" ON public.processing_errors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage errors" ON public.processing_errors
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- duplicate_events table
CREATE TABLE public.duplicate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unique_event_id TEXT NOT NULL,
  raw_payload_json JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duplicate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view duplicates" ON public.duplicate_events
  FOR SELECT TO authenticated USING (true);

-- service_logs table
CREATE TABLE public.service_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'info',
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs" ON public.service_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert logs" ON public.service_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_logs_level ON public.service_logs(level);
CREATE INDEX idx_logs_module ON public.service_logs(module);
CREATE INDEX idx_logs_created ON public.service_logs(created_at DESC);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.processed_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
