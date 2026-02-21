-- ============================================================
-- Seed: ambient_videos
-- Curated free, legally-embeddable language content.
--
-- All YouTube embeds use youtube-nocookie.com (privacy-enhanced
-- mode explicitly recommended by YouTube for site embeds and
-- permitted under the YouTube Terms of Service).
--
-- To refresh / add channels without a code deploy, edit rows
-- directly in the Supabase Table Editor or via supabase CLI.
-- ============================================================

-- ─── FRENCH (fr) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Live news – France24 French 24/7 stream
('fr', 'France 24 — Live',
 'La chaîne d''info internationale 24h/24 en français.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCywP1NIDJHhRi_RcRayCEjQ&rel=0&modestbranding=1',
 'youtube', 'news', 'https://i.ytimg.com/vi/live_stream/hqdefault.jpg', 'Live 24/7', TRUE),

-- Euronews French live (backup news for fr)
('fr', 'Euronews en Français — Live',
 'Journal télévisé et actualités mondiales en direct.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCrawMczIAMTsBerIbfEvN8g&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Learning – InnerFrench (B1-B2 slow & clear)
('fr', 'Inner French — Playlist',
 'French at intermediate speed, perfect for B1–B2 immersion learners.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLm9HZkpS3oUKJe0b_HaC6L78mV5HEYwCQ&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~20 min', FALSE),

-- Learning – Extra French (A1–A2 sitcom, widely used in classrooms)
('fr', 'Extra en Français — Série complète',
 'Sitcom pédagogique idéale pour les débutants (A1–A2).',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLpFPIBmETMa4IzVFN-bfk3kS959nVWAA5&rel=0&modestbranding=1',
 'youtube', 'series', NULL, 'Series · 13 eps', FALSE),

-- Kids – Peppa Pig en Français (official channel)
('fr', 'Peppa Pig en Français',
 'Les aventures de Peppa cochon — idéales pour les très débutants.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLzAfnLPDO6-xMwnT4h4XRlBbxqJSmhMZ8&rel=0&modestbranding=1',
 'youtube', 'kids', NULL, 'Series · short clips', FALSE),

-- Culture – Arte (French/German public broadcaster, free streaming)
('fr', 'Arte — Documentaires',
 'Documentaires et magazines culturels franco-allemands en accès libre.',
 'https://www.arte.tv/player/v3/embed/fr/RC-023039/?autoplay=false',
 'arte', 'culture', NULL, 'Various', FALSE);

-- ─── GERMAN (de) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning A1 – Nicos Weg (DW official German course, A1)
('de', 'Nicos Weg A1 — DW Deutsch lernen',
 'Offizielle DW-Serie für Anfänger. Folgt Nico durch Deutschland.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLTs5O_ByNJYohlWFD3j6FbMuF7QetCXqv&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · 186 eps', FALSE),

-- Learning B1 – Easy German street interviews
('de', 'Easy German — Straßeninterviews',
 'Native speakers on the street with dual German/English subtitles.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLbHkSB8nNfEP0A2Oc4QJwKSFIPJFdwzrQ&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~10 min', FALSE),

-- Live news – DW Nachrichten live
('de', 'DW — Nachrichten live',
 'Deutsche Welle live – Aktuelle Nachrichten aus Deutschland und der Welt.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC3myfVF33TfTDF7BrAECeHQ&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Kids – Sendung mit der Maus (WDR/ARD official)
('de', 'Sendung mit der Maus',
 'Kindersendung mit lehrreichen Kurzfilmen – seit 1971 auf ARD.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLjBbPNbJPTxT9RY3TF9bF0HJlDMHpfZ0n&rel=0&modestbranding=1',
 'youtube', 'kids', NULL, 'Series · short clips', FALSE),

-- Culture – Arte (German version)
('de', 'Arte — Dokumentarfilme',
 'Hochwertige Dokumentarfilme und Magazine auf Arte kostenlos.',
 'https://www.arte.tv/player/v3/embed/de/RC-023039/?autoplay=false',
 'arte', 'culture', NULL, 'Various', FALSE);

-- ─── SPANISH (es) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning Beginner – Dreaming Spanish (comprehensible input)
('es', 'Dreaming Spanish — Beginner',
 'Super-slow immersive Spanish for total beginners. A1 level.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLt8c566cMR93TYT7W3DwUnvTdWL3L-K2N&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~5 min', FALSE),

-- Learning A1-A2 – Extra en Español
('es', 'Extra en Español — Serie completa',
 'Comedia de situación para aprender español de forma natural.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLF5jiGBnQzQH5ueUgMQLKpvQGpE8p9Kos&rel=0&modestbranding=1',
 'youtube', 'series', NULL, 'Series · 13 eps', FALSE),

-- Live news – RTVE Noticias 24
('es', 'RTVE — 24 Horas en directo',
 'El canal informativo de RTVE con noticias en español 24 horas.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCmG4A_-LTp5a4bqxsN5M11A&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Kids – Peppa Pig en Español
('es', 'Peppa Pig en Español',
 'Peppa Pig en español latino – perfecto para los principiantes.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLivjPDlt29q3oKzDMj_B4S6Yn17vM8nAv&rel=0&modestbranding=1',
 'youtube', 'kids', NULL, 'Series · short clips', FALSE),

-- Culture – Euronews Español live
('es', 'Euronews en Español — Live',
 'Noticias europeas e internacionales en directo en español.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCIALMKvObZNtJ4AEqBzr6aA&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);

-- ─── ITALIAN (it) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – Italiano Automatico (beginner-friendly)
('it', 'Italiano Automatico — Playlist',
 'Immersione nella lingua italiana con conversazioni naturali.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL24CE6D8A6F5069E1&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~10 min', FALSE),

-- Learning A1-A2 – Extra in Italiano
('it', 'Extra in Italiano — Serie completa',
 'La commedia americana adattata per imparare l''italiano.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLEMk4LL3C0EEmk4kTVjhf_Iu9iVvgUUlP&rel=0&modestbranding=1',
 'youtube', 'series', NULL, 'Series · 13 eps', FALSE),

-- Live news – RAI News 24
('it', 'RAI News 24 — Live',
 'Il canale all-news di RAI, notizie italiane e internazionali in directo.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCKBnOBo-F_OhYMpSrv1Sg0A&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Kids – Peppa Pig in Italiano
('it', 'Peppa Pig in Italiano',
 'Peppa Pig nella versione italiana – ottimo per principianti.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLVMxNzIULGCacl3E_0JKAbRPi1M0XFBLZ&rel=0&modestbranding=1',
 'youtube', 'kids', NULL, 'Series · short clips', FALSE);

-- ─── PORTUGUESE (pt) ─────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – Easy Portuguese (EP focus)
('pt', 'Easy Portuguese — Street Interviews',
 'Interviews with native speakers in Portugal, subtitled in PT & EN.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLom0gFhUhprUi3kpOJqBPLRNMHuE0vfHF&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~8 min', FALSE),

-- Live news – RTP Informação live
('pt', 'RTP Informação — Live',
 'RTP – canal de notícias português em direto.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCx8-lOjUfPbHcGldRvBkn5A&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Kids – Peppa Pig em Português
('pt', 'Peppa Pig em Português',
 'Peppa Pig dublada em português europeu.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLkqJGWH4oFj4TymFdCelB0C4gdvPjQHiX&rel=0&modestbranding=1',
 'youtube', 'kids', NULL, 'Series · short clips', FALSE);

-- ─── JAPANESE (ja) ──────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – Comprehensible Japanese (CI-based)
('ja', 'Comprehensible Japanese — Beginner',
 'Slow, natural Japanese for absolute beginners. 100% in Japanese.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLPdNX2arS9Mb1iiA0xHRETgBhYkN5-WxP&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~5 min', FALSE),

-- Culture / News – NHK World Japan (free, embeddable)
('ja', 'NHK World Japan — Live',
 'NHK World Japan live stream — English reporting on Japan & Asia.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC1eIjBz84DJUT1qHLB-A1pA&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE),

-- Culture – JapanesePod101 culture snippets
('ja', 'Learn Japanese with JapanesePod101',
 'Free Japanese culture, vocabulary and phrases for learners.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL9pDl_Yl7HMJKGmoCgFaBSP-d_G-7oxqN&rel=0&modestbranding=1',
 'youtube', 'culture', NULL, 'Series · ~3 min', FALSE);

-- ─── KOREAN (ko) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – KoreanClass101
('ko', 'Learn Korean with KoreanClass101',
 'Beginner Korean lessons — vocabulary, culture, and grammar.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMl07O19cAdfpKqGPtxqXw4&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE),

-- News – KBS World live
('ko', 'KBS World — Live',
 'KBS World 24/7 live broadcast — Korean public broadcaster.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCpcTrCXblq78GZrTUTLWeBw&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);

-- ─── MANDARIN CHINESE (zh) ───────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – Mandarin Corner (CI immersion)
('zh', 'Mandarin Corner — Intermediate',
 'Real Mandarin conversations with full subtitles for learners.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLMFqBMgFsv_A8GOqRnDsJE3H2tlLJEhtQ&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~10 min', FALSE),

-- News – CGTN live (Chinese state international broadcaster)
('zh', 'CGTN 中文 — Live',
 'CGTN 中文国际频道 — 24小时中文新闻直播.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UChX9OTQ8yZdGEBMSBCFMPDQ&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);

-- ─── ARABIC (ar) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – ArabicPod101
('ar', 'Learn Arabic with ArabicPod101',
 'Arabic for beginners — MSA and dialect lessons.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMd-9TnkFPsJf3eVqdMcBMI&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE),

-- News – Al Jazeera Arabic live
('ar', 'الجزيرة مباشر — Live',
 'قناة الجزيرة الإخبارية — البث المباشر على مدار الساعة.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UC0d3MKEh3JiYyAVSKDoFzkw&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);

-- ─── RUSSIAN (ru) ────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – Russian Progress
('ru', 'Russian Progress — Beginner Playlist',
 'Immersive Russian for beginners, slow and clear.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PLBVoILLPCygVJfKCHK6iFaRwUZiOqCANT&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~8 min', FALSE);

-- ─── DUTCH (nl) ──────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – DutchPod101
('nl', 'Learn Dutch with DutchPod101',
 'Dutch vocabulary, grammar and culture for learners.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMxMSO4qFoaIaJxHJNlFHTe&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE),

-- News – NOS live (Dutch public broadcaster)
('nl', 'NOS — Live Journaal',
 'NOS Journaal live — het Nederlandse nieuws.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCuNqoCMFABPULnQQzr1-ORw&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);

-- ─── POLISH (pl) ─────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

('pl', 'Learn Polish with PolishPod101',
 'Polish for beginners — vocabulary and conversational phrases.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMhULFuqbpFMHHPFMHHKwQr&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE);

-- ─── SWEDISH (sv) ────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

('sv', 'Learn Swedish with SwedishPod101',
 'Swedish for beginners — vocabulary and conversational phrases.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMiw8_K1bCOIb_D_1cqjt_v&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE);

-- ─── TURKISH (tr) ────────────────────────────────────────────────────────────

INSERT INTO ambient_videos (language_code, title, description, embed_url, source, category, thumbnail_url, duration_hint, is_live) VALUES

-- Learning – TurkishPod101
('tr', 'Learn Turkish with TurkishPod101',
 'Turkish vocabulary, phrases and culture for learners.',
 'https://www.youtube-nocookie.com/embed/videoseries?list=PL46g1LvBRSOMQMpST-Y5BSQIUAO5VW9C0&rel=0&modestbranding=1',
 'youtube', 'learning', NULL, 'Series · ~3 min', FALSE),

-- News – TRT International live
('tr', 'TRT Haber — Live',
 'TRT Haber — Türkiye''nin haber kanalı canlı yayın.',
 'https://www.youtube-nocookie.com/embed/live_stream?channel=UCE1xBuqBT7jzxbBK2CQFRpA&rel=0&modestbranding=1',
 'youtube', 'news', NULL, 'Live 24/7', TRUE);
