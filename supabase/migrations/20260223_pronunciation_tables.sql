-- ============================================================================
-- Pronunciation Training Tables
-- ============================================================================

-- 1. Phonemes — one row per phoneme per language
CREATE TABLE IF NOT EXISTS phonemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language varchar(10) NOT NULL,
  ipa_symbol varchar(10) NOT NULL,
  label text,
  description text,
  example_words jsonb DEFAULT '[]'::jsonb,
  audio_url text,
  difficulty_rank int DEFAULT 5,
  native_language_equivalent varchar(20),
  created_at timestamptz DEFAULT now(),
  UNIQUE(language, ipa_symbol)
);

-- 2. Minimal pairs — two phonemes that are easily confused
CREATE TABLE IF NOT EXISTS minimal_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language varchar(10) NOT NULL,
  phoneme_a_id uuid REFERENCES phonemes(id) ON DELETE CASCADE,
  phoneme_b_id uuid REFERENCES phonemes(id) ON DELETE CASCADE,
  example_word_a text NOT NULL,
  example_word_b text NOT NULL,
  audio_url_a text,
  audio_url_b text,
  difficulty_rank int DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

-- 3. Shadowing phrases — native speaker utterances for shadowing
CREATE TABLE IF NOT EXISTS shadowing_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language varchar(10) NOT NULL,
  text text NOT NULL,
  ipa_transcription text,
  audio_url text,
  cefr_level varchar(5) DEFAULT 'A1',
  focus_phoneme_id uuid REFERENCES phonemes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. User pronunciation progress — per-user, per-phoneme tracking
CREATE TABLE IF NOT EXISTS user_pronunciation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  phoneme_id uuid REFERENCES phonemes(id) ON DELETE CASCADE,
  familiarity_score float DEFAULT 0,
  times_practiced int DEFAULT 0,
  last_practiced_at timestamptz,
  minimal_pair_accuracy float,
  shadowing_scores jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, language, phoneme_id)
);

-- 5. User pronunciation sessions — per-session log
CREATE TABLE IF NOT EXISTS user_pronunciation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  language varchar(10) NOT NULL,
  module_type varchar(30) NOT NULL,
  duration_seconds int DEFAULT 0,
  items_practiced int DEFAULT 0,
  accuracy float,
  session_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phonemes_language ON phonemes(language);
CREATE INDEX IF NOT EXISTS idx_minimal_pairs_language ON minimal_pairs(language);
CREATE INDEX IF NOT EXISTS idx_shadowing_phrases_language_level ON shadowing_phrases(language, cefr_level);
CREATE INDEX IF NOT EXISTS idx_user_pronunciation_progress_user ON user_pronunciation_progress(user_id, language);
CREATE INDEX IF NOT EXISTS idx_user_pronunciation_sessions_user ON user_pronunciation_sessions(user_id, language);

-- RLS policies
ALTER TABLE phonemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE minimal_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadowing_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pronunciation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pronunciation_sessions ENABLE ROW LEVEL SECURITY;

-- Public read for content tables
CREATE POLICY "phonemes_public_read" ON phonemes FOR SELECT USING (true);
CREATE POLICY "minimal_pairs_public_read" ON minimal_pairs FOR SELECT USING (true);
CREATE POLICY "shadowing_phrases_public_read" ON shadowing_phrases FOR SELECT USING (true);

-- User-owned progress
CREATE POLICY "pronunciation_progress_own" ON user_pronunciation_progress
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pronunciation_sessions_own" ON user_pronunciation_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA — German Phonemes
-- ============================================================================
INSERT INTO phonemes (language, ipa_symbol, label, description, example_words, difficulty_rank, native_language_equivalent) VALUES
('de', 'ʏ', 'Short ü', 'Round your lips as if saying "oo" but try to say "ih". Tongue is high and front, lips are rounded. Short duration.', '[{"word": "Stück", "translation": "piece"}, {"word": "Glück", "translation": "luck"}, {"word": "Brücke", "translation": "bridge"}]', 2, null),
('de', 'yː', 'Long ü', 'Same tongue position as short ü but held longer. Lips firmly rounded, tongue high and forward. Think "ee" with rounded lips.', '[{"word": "über", "translation": "over"}, {"word": "Tür", "translation": "door"}, {"word": "grün", "translation": "green"}]', 2, null),
('de', 'ø', 'Short ö', 'Say "eh" but with rounded lips. Tongue is mid-front, lips form a small circle. Quick and tense.', '[{"word": "können", "translation": "can/able"}, {"word": "Hölle", "translation": "hell"}, {"word": "öffnen", "translation": "to open"}]', 3, null),
('de', 'øː', 'Long ö', 'Like short ö but sustained. Lips stay rounded throughout. Tongue mid-front position held steady.', '[{"word": "schön", "translation": "beautiful"}, {"word": "hören", "translation": "to hear"}, {"word": "böse", "translation": "angry/evil"}]', 3, null),
('de', 'x', 'ach-Laut', 'A throaty, raspy sound made at the back of the mouth. Tongue arches toward the soft palate, air scrapes through. Like clearing your throat gently.', '[{"word": "Bach", "translation": "stream"}, {"word": "Nacht", "translation": "night"}, {"word": "machen", "translation": "to make"}]', 4, null),
('de', 'ç', 'ich-Laut', 'A soft hissing sound, like whispering "huge" in English. Tongue pushes up toward the hard palate. Lighter and more forward than ach-Laut.', '[{"word": "ich", "translation": "I"}, {"word": "Licht", "translation": "light"}, {"word": "wichtig", "translation": "important"}]', 3, null),
('de', 'ʁ', 'German R', 'Uvular fricative — a soft gargling vibration at the back of the throat. Not trilled at the tongue tip. Think of a gentle French R.', '[{"word": "rot", "translation": "red"}, {"word": "Regen", "translation": "rain"}, {"word": "fahren", "translation": "to drive"}]', 5, null),
('de', 'ts', 'German Z', 'A quick "ts" combination, like the end of "cats". Tongue taps the ridge behind the teeth, then releases into an "s".', '[{"word": "zu", "translation": "to/too"}, {"word": "Zeit", "translation": "time"}, {"word": "Zimmer", "translation": "room"}]', 1, 'ts in cats'),
('de', 'pf', 'pf-sound', 'Lips close for "p" then immediately release into "f". A single fluid motion — not two separate sounds.', '[{"word": "Pferd", "translation": "horse"}, {"word": "Apfel", "translation": "apple"}, {"word": "Kopf", "translation": "head"}]', 4, null),
('de', 'aɪ', 'German ei', 'Starts with an open "ah" and glides toward "ih". Wider than the English "eye" — the jaw drops more at the start.', '[{"word": "Eis", "translation": "ice"}, {"word": "Wein", "translation": "wine"}, {"word": "klein", "translation": "small"}]', 1, 'eye')
ON CONFLICT (language, ipa_symbol) DO NOTHING;

-- ============================================================================
-- SEED DATA — French Phonemes
-- ============================================================================
INSERT INTO phonemes (language, ipa_symbol, label, description, example_words, difficulty_rank, native_language_equivalent) VALUES
('fr', 'y', 'French u', 'Say "ee" with tightly rounded lips. Tongue is high and forward like "ee" but lips form a tiny circle. Not "oo".', '[{"word": "tu", "translation": "you"}, {"word": "rue", "translation": "street"}, {"word": "lune", "translation": "moon"}]', 2, null),
('fr', 'ø', 'eu (closed)', 'Say "ay" with rounded lips. Tongue mid-front, lips gently rounded. Like saying "uh" but more forward.', '[{"word": "peu", "translation": "few"}, {"word": "deux", "translation": "two"}, {"word": "bleu", "translation": "blue"}]', 3, null),
('fr', 'œ', 'eu (open)', 'More open than closed eu. Jaw drops slightly, lips still rounded. Like "uh" in "but" with rounded lips.', '[{"word": "heure", "translation": "hour"}, {"word": "peur", "translation": "fear"}, {"word": "sœur", "translation": "sister"}]', 3, null),
('fr', 'ɑ̃', 'Nasal an', 'Say "ah" but route the air through your nose. Lower your soft palate. Do NOT pronounce any "n" at the end.', '[{"word": "dans", "translation": "in"}, {"word": "France", "translation": "France"}, {"word": "blanc", "translation": "white"}]', 4, null),
('fr', 'ɛ̃', 'Nasal in', 'Say "eh" but nasalized. Mouth position of "eh", air exits through the nose. No final "n" sound.', '[{"word": "vin", "translation": "wine"}, {"word": "pain", "translation": "bread"}, {"word": "matin", "translation": "morning"}]', 4, null),
('fr', 'ɔ̃', 'Nasal on', 'Say "oh" but nasalized. Lips rounded, air through the nose. No "n" at the end.', '[{"word": "bon", "translation": "good"}, {"word": "monde", "translation": "world"}, {"word": "maison", "translation": "house"}]', 4, null),
('fr', 'ʁ', 'French R', 'A soft, voiced uvular fricative. Gentle friction at the very back of the throat. Not rolled or trilled — think of a quiet gargle.', '[{"word": "rouge", "translation": "red"}, {"word": "Paris", "translation": "Paris"}, {"word": "merci", "translation": "thank you"}]', 5, null),
('fr', 'ʒ', 'French j/g', 'Like the "s" in English "pleasure" or "vision". Tongue close to the palate, voice buzzes through.', '[{"word": "jour", "translation": "day"}, {"word": "rouge", "translation": "red"}, {"word": "je", "translation": "I"}]', 1, 'zh in pleasure'),
('fr', 'ɥ', 'Semi-vowel u', 'A very quick French "y" sound that glides into the next vowel. Say "u" rapidly before the following sound. Lips round then release.', '[{"word": "huit", "translation": "eight"}, {"word": "nuit", "translation": "night"}, {"word": "lui", "translation": "him"}]', 3, null),
('fr', 'ɑ', 'Back a', 'A deep, open "ah" sound produced at the back of the mouth. Jaw drops fully, tongue stays low and back.', '[{"word": "pâte", "translation": "dough"}, {"word": "âme", "translation": "soul"}, {"word": "bas", "translation": "low"}]', 2, 'ah in father')
ON CONFLICT (language, ipa_symbol) DO NOTHING;

-- ============================================================================
-- SEED DATA — Italian Phonemes
-- ============================================================================
INSERT INTO phonemes (language, ipa_symbol, label, description, example_words, difficulty_rank, native_language_equivalent) VALUES
('it', 'ts', 'Z sorda', 'Voiceless "ts" — like "cats". Tongue hits the alveolar ridge, releases into sibilant.', '[{"word": "pizza", "translation": "pizza"}, {"word": "stazione", "translation": "station"}, {"word": "grazie", "translation": "thanks"}]', 2, 'ts in cats'),
('it', 'dz', 'Z sonora', 'Voiced "dz" — like "adze". Same tongue position as ts but with vocal cord vibration.', '[{"word": "zero", "translation": "zero"}, {"word": "zona", "translation": "zone"}, {"word": "azzurro", "translation": "blue"}]', 3, 'dz in adze'),
('it', 'tʃ', 'C dolce', 'Like English "ch" in "church". Tongue blade touches the palate, releases with friction.', '[{"word": "cena", "translation": "dinner"}, {"word": "cinema", "translation": "cinema"}, {"word": "dolce", "translation": "sweet"}]', 1, 'ch in church'),
('it', 'dʒ', 'G dolce', 'Like English "j" in "jump". Voiced version of C dolce.', '[{"word": "gelato", "translation": "ice cream"}, {"word": "giorno", "translation": "day"}, {"word": "viaggio", "translation": "journey"}]', 1, 'j in jump'),
('it', 'ɲ', 'GN sound', 'Like "ny" in "canyon". Tongue body presses against the hard palate. A single, blended nasal sound.', '[{"word": "gnocchi", "translation": "gnocchi"}, {"word": "bagno", "translation": "bathroom"}, {"word": "signore", "translation": "sir"}]', 3, 'ny in canyon'),
('it', 'ʎ', 'GL sound', 'Like "lli" in "million". Tongue blade touches the palate laterally. Air escapes around tongue sides.', '[{"word": "famiglia", "translation": "family"}, {"word": "figlio", "translation": "son"}, {"word": "aglio", "translation": "garlic"}]', 4, null),
('it', 'rr', 'Rolled R', 'Alveolar trill — tongue tip vibrates rapidly against the alveolar ridge. Multiple rapid taps for geminate rr.', '[{"word": "terra", "translation": "earth"}, {"word": "birra", "translation": "beer"}, {"word": "guerra", "translation": "war"}]', 5, null),
('it', 'r', 'Single R', 'Alveolar tap — tongue tip taps the ridge once. Lighter and quicker than the rolled rr.', '[{"word": "sera", "translation": "evening"}, {"word": "caro", "translation": "dear"}, {"word": "Roma", "translation": "Rome"}]', 4, null),
('it', 'kk', 'Double C (hard)', 'Geminate — the "k" is held longer before release. Close the throat, pause, then release.', '[{"word": "banca", "translation": "bank"}, {"word": "ecco", "translation": "here"}, {"word": "secco", "translation": "dry"}]', 3, null),
('it', 'ɛ', 'Open E', 'Jaw drops more than closed "e". Like the "e" in English "bed" but more open and resonant.', '[{"word": "bello", "translation": "beautiful"}, {"word": "festa", "translation": "party"}, {"word": "bene", "translation": "well"}]', 2, 'e in bed')
ON CONFLICT (language, ipa_symbol) DO NOTHING;

-- ============================================================================
-- SEED DATA — Minimal Pairs (German)
-- ============================================================================
INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'de', a.id, b.id, 'Stück', 'Stuck', 2
FROM phonemes a, phonemes b
WHERE a.language = 'de' AND a.ipa_symbol = 'ʏ' AND b.language = 'de' AND b.ipa_symbol = 'aɪ';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'de', a.id, b.id, 'über', 'Übel', 3
FROM phonemes a, phonemes b
WHERE a.language = 'de' AND a.ipa_symbol = 'yː' AND b.language = 'de' AND b.ipa_symbol = 'ʏ';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'de', a.id, b.id, 'Höhle', 'Hölle', 1
FROM phonemes a, phonemes b
WHERE a.language = 'de' AND a.ipa_symbol = 'øː' AND b.language = 'de' AND b.ipa_symbol = 'ø';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'de', a.id, b.id, 'ich', 'ach', 2
FROM phonemes a, phonemes b
WHERE a.language = 'de' AND a.ipa_symbol = 'ç' AND b.language = 'de' AND b.ipa_symbol = 'x';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'de', a.id, b.id, 'Zeit', 'Seit', 1
FROM phonemes a, phonemes b
WHERE a.language = 'de' AND a.ipa_symbol = 'ts' AND b.language = 'de' AND b.ipa_symbol = 'aɪ';

-- ============================================================================
-- SEED DATA — Minimal Pairs (French)
-- ============================================================================
INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'fr', a.id, b.id, 'rue', 'roue', 1
FROM phonemes a, phonemes b
WHERE a.language = 'fr' AND a.ipa_symbol = 'y' AND b.language = 'fr' AND b.ipa_symbol = 'ʁ';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'fr', a.id, b.id, 'peu', 'peur', 2
FROM phonemes a, phonemes b
WHERE a.language = 'fr' AND a.ipa_symbol = 'ø' AND b.language = 'fr' AND b.ipa_symbol = 'œ';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'fr', a.id, b.id, 'dans', 'dont', 1
FROM phonemes a, phonemes b
WHERE a.language = 'fr' AND a.ipa_symbol = 'ɑ̃' AND b.language = 'fr' AND b.ipa_symbol = 'ɔ̃';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'fr', a.id, b.id, 'vin', 'vent', 2
FROM phonemes a, phonemes b
WHERE a.language = 'fr' AND a.ipa_symbol = 'ɛ̃' AND b.language = 'fr' AND b.ipa_symbol = 'ɑ̃';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'fr', a.id, b.id, 'nuit', 'noue', 3
FROM phonemes a, phonemes b
WHERE a.language = 'fr' AND a.ipa_symbol = 'ɥ' AND b.language = 'fr' AND b.ipa_symbol = 'ʁ';

-- ============================================================================
-- SEED DATA — Minimal Pairs (Italian)
-- ============================================================================
INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'it', a.id, b.id, 'pizza', 'pezza', 1
FROM phonemes a, phonemes b
WHERE a.language = 'it' AND a.ipa_symbol = 'ts' AND b.language = 'it' AND b.ipa_symbol = 'dz';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'it', a.id, b.id, 'cena', 'gena', 2
FROM phonemes a, phonemes b
WHERE a.language = 'it' AND a.ipa_symbol = 'tʃ' AND b.language = 'it' AND b.ipa_symbol = 'dʒ';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'it', a.id, b.id, 'sera', 'terra', 1
FROM phonemes a, phonemes b
WHERE a.language = 'it' AND a.ipa_symbol = 'r' AND b.language = 'it' AND b.ipa_symbol = 'rr';

INSERT INTO minimal_pairs (language, phoneme_a_id, phoneme_b_id, example_word_a, example_word_b, difficulty_rank)
SELECT 'it', a.id, b.id, 'bagno', 'bello', 3
FROM phonemes a, phonemes b
WHERE a.language = 'it' AND a.ipa_symbol = 'ɲ' AND b.language = 'it' AND b.ipa_symbol = 'ɛ';

-- ============================================================================
-- SEED DATA — Shadowing Phrases (German)
-- ============================================================================
INSERT INTO shadowing_phrases (language, text, ipa_transcription, cefr_level) VALUES
('de', 'Ich möchte ein Glas Wasser.', 'ɪç ˈmœçtə aɪn ɡlaːs ˈvasɐ', 'A1'),
('de', 'Wie viel Uhr ist es?', 'viː fiːl uːɐ̯ ɪst ɛs', 'A1'),
('de', 'Die Brücke über den Fluss ist sehr schön.', 'diː ˈbrʏkə ˈyːbɐ deːn flʊs ɪst zeːɐ̯ ʃøːn', 'A2'),
('de', 'Könnten Sie mir bitte helfen?', 'ˈkœntən ziː mɪɐ̯ ˈbɪtə ˈhɛlfən', 'A2'),
('de', 'Ich habe gestern Nacht nicht gut geschlafen.', 'ɪç ˈhaːbə ˈɡɛstɐn naxt nɪçt ɡuːt ɡəˈʃlaːfən', 'B1'),
('de', 'Die Züge fahren heute leider nicht pünktlich.', 'diː ˈtsyːɡə ˈfaːrən ˈhɔʏ̯tə ˈlaɪ̯dɐ nɪçt ˈpʏŋktlɪç', 'B1');

-- ============================================================================
-- SEED DATA — Shadowing Phrases (French)
-- ============================================================================
INSERT INTO shadowing_phrases (language, text, ipa_transcription, cefr_level) VALUES
('fr', 'Je voudrais un verre d''eau.', 'ʒə vudʁɛ œ̃ vɛʁ do', 'A1'),
('fr', 'Quelle heure est-il?', 'kɛl œʁ ɛ til', 'A1'),
('fr', 'La rue est très belle la nuit.', 'la ʁy ɛ tʁɛ bɛl la nɥi', 'A2'),
('fr', 'Pourriez-vous m''aider, s''il vous plaît?', 'puʁje vu mede sil vu plɛ', 'A2'),
('fr', 'Je n''ai pas bien dormi cette nuit.', 'ʒə nɛ pa bjɛ̃ dɔʁmi sɛt nɥi', 'B1'),
('fr', 'Les trains ne sont malheureusement pas à l''heure.', 'le tʁɛ̃ nə sɔ̃ maløʁøzmɑ̃ pa a lœʁ', 'B1');

-- ============================================================================
-- SEED DATA — Shadowing Phrases (Italian)
-- ============================================================================
INSERT INTO shadowing_phrases (language, text, ipa_transcription, cefr_level) VALUES
('it', 'Vorrei un bicchiere d''acqua.', 'vorˈrɛi un bikˈkjɛːre ˈdakkwa', 'A1'),
('it', 'Che ore sono?', 'ke ˈoːre ˈsoːno', 'A1'),
('it', 'La famiglia è molto importante in Italia.', 'la faˈmiʎʎa ɛ ˈmolto imporˈtante in iˈtaːlja', 'A2'),
('it', 'Potrebbe aiutarmi, per favore?', 'poˈtrɛbbe ajuˈtarmi per faˈvoːre', 'A2'),
('it', 'Ieri sera non ho dormito bene.', 'ˈjɛːri ˈseːra non ɔ dorˈmiːto ˈbɛːne', 'B1'),
('it', 'La pizza napoletana è la migliore del mondo.', 'la ˈpittsa napoliˈtaːna ɛ la miʎˈʎoːre del ˈmondo', 'B1');
