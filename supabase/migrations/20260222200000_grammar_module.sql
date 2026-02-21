-- ============================================================================
-- Grammar Learning Module — Lingolia-style grammar lessons for Fluensea
-- ============================================================================

-- Grammar topic hierarchy: categories → topics → subtopics
CREATE TABLE grammar_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  ocean_zone TEXT CHECK (ocean_zone IN ('surface','shallow','reef','deep','abyss')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(language_code, slug)
);

CREATE TABLE grammar_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES grammar_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE TABLE grammar_subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, slug)
);

-- Lesson content (all pre-authored, never AI-generated at runtime)
CREATE TABLE grammar_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id UUID NOT NULL REFERENCES grammar_subtopics(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation_md TEXT NOT NULL,
  summary_table_json JSONB,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  cefr_level TEXT CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exercises linked to lessons
CREATE TABLE grammar_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fill_blank','multiple_choice','sentence_transform','error_correction')),
  prompt TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty IN (1,2,3)) DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User progress tracking
CREATE TABLE user_lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE user_exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
  was_correct BOOLEAN NOT NULL,
  user_answer TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_grammar_categories_lang ON grammar_categories(language_code);
CREATE INDEX idx_grammar_topics_category ON grammar_topics(category_id);
CREATE INDEX idx_grammar_subtopics_topic ON grammar_subtopics(topic_id);
CREATE INDEX idx_grammar_lessons_subtopic ON grammar_lessons(subtopic_id);
CREATE INDEX idx_grammar_exercises_lesson ON grammar_exercises(lesson_id);
CREATE INDEX idx_user_lesson_completions_user ON user_lesson_completions(user_id);
CREATE INDEX idx_user_exercise_attempts_user ON user_exercise_attempts(user_id);
CREATE INDEX idx_user_exercise_attempts_exercise ON user_exercise_attempts(exercise_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Content tables: publicly readable
ALTER TABLE grammar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grammar categories are publicly readable"
  ON grammar_categories FOR SELECT USING (true);

CREATE POLICY "Grammar topics are publicly readable"
  ON grammar_topics FOR SELECT USING (true);

CREATE POLICY "Grammar subtopics are publicly readable"
  ON grammar_subtopics FOR SELECT USING (true);

CREATE POLICY "Grammar lessons are publicly readable"
  ON grammar_lessons FOR SELECT USING (true);

CREATE POLICY "Grammar exercises are publicly readable"
  ON grammar_exercises FOR SELECT USING (true);

-- User progress: users can only manage their own rows
ALTER TABLE user_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exercise_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lesson completions"
  ON user_lesson_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson completions"
  ON user_lesson_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own exercise attempts"
  ON user_exercise_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise attempts"
  ON user_exercise_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
