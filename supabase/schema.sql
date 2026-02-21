-- Supabase Database Schema for Lingua

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Learning profile
  target_language TEXT DEFAULT 'fr' NOT NULL,
  native_language TEXT DEFAULT 'en' NOT NULL,
  proficiency_level TEXT DEFAULT 'A0' CHECK (proficiency_level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  interests TEXT[] DEFAULT '{}',
  
  -- Subscription
  subscription_tier TEXT DEFAULT 'snorkeler' CHECK (subscription_tier IN ('snorkeler', 'diver', 'submariner')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'none')),
  next_payment_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  
  -- Paystack integration
  paystack_customer_code TEXT UNIQUE,
  paystack_subscription_code TEXT UNIQUE
);

-- Content segments
CREATE TABLE content_segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  language TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  topic TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  
  audio_url TEXT NOT NULL,
  transcript TEXT NOT NULL,
  translations JSONB DEFAULT '{}',
  
  key_vocabulary TEXT[] DEFAULT '{}',
  grammar_patterns TEXT[] DEFAULT '{}'
);

-- Comprehension questions
CREATE TABLE comprehension_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  segment_id UUID REFERENCES content_segments ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  question TEXT NOT NULL,
  question_language TEXT NOT NULL CHECK (question_language IN ('native', 'target')),
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT
);

-- User progress tracking
CREATE TABLE user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES content_segments ON DELETE CASCADE NOT NULL,
  
  first_encountered TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_encountered TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  times_heard INTEGER DEFAULT 0,
  comprehension_score INTEGER DEFAULT 0,
  spoken_attempts INTEGER DEFAULT 0,
  
  UNIQUE(user_id, segment_id)
);

-- Session logs
CREATE TABLE session_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  segment_id UUID REFERENCES content_segments,
  overall_comprehension INTEGER,
  
  metadata JSONB DEFAULT '{}'
);

-- Speaking attempts
CREATE TABLE speaking_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES content_segments,
  
  audio_url TEXT NOT NULL,
  transcript TEXT,
  pronunciation_score DECIMAL(5,2),
  fluency_score DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_segment_id ON user_progress(segment_id);
CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX idx_content_segments_level ON content_segments(level);
CREATE INDEX idx_content_segments_topic ON content_segments(topic);

-- Row Level Security (RLS) Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- User progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" 
  ON user_progress FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" 
  ON user_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
  ON user_progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- Session logs
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" 
  ON session_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
  ON session_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Speaking attempts
ALTER TABLE speaking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings" 
  ON speaking_attempts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" 
  ON speaking_attempts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Content is publicly readable
ALTER TABLE content_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content is publicly readable" 
  ON content_segments FOR SELECT 
  TO authenticated
  USING (true);

ALTER TABLE comprehension_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are publicly readable" 
  ON comprehension_questions FOR SELECT 
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage buckets for user avatars, audio recordings, and lesson audio
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('recordings', 'recordings', false),
  ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for recordings bucket
CREATE POLICY "Users can view their own recordings" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own recordings" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own recordings" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for lesson-audio bucket (public read, authenticated users can upload their own)
CREATE POLICY "Lesson audio is publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'lesson-audio');

CREATE POLICY "Users can upload their own lesson audio" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'lesson-audio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own lesson audio" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'lesson-audio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own lesson audio" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'lesson-audio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
