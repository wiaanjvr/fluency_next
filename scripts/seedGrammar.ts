/**
 * seedGrammar.ts — Reads all grammar content files and upserts them into Supabase.
 *
 * Run with: npx tsx scripts/seedGrammar.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";
import { URL } from "url";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseReachable(urlStr: string, timeout = 5000) {
  try {
    const u = new URL(urlStr);
    return await new Promise<boolean>((resolve) => {
      const opts: https.RequestOptions = {
        method: "HEAD",
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname || "/",
        timeout,
      };

      const req = https.request(opts, (res) => {
        // Any 2xx/3xx/4xx/5xx response means the host is reachable
        res.resume();
        resolve(true);
      });

      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  } catch (err) {
    return false;
  }
}

// --- Content imports (using relative paths since tsx resolves them) ---
import type {
  GrammarContentFile,
  CEFRLevel,
  OceanZone,
} from "../src/types/grammar.types";

// We must import all content files explicitly (no dynamic requires with tsx)
import starkeVerben from "../src/data/grammar/de/verben/prasens/starke-verben";
import nominativ from "../src/data/grammar/de/nomen/kasus/nominativ";
import habenVerben from "../src/data/grammar/de/verben/perfekt/haben-verben";

const ALL_CONTENT: GrammarContentFile[] = [
  starkeVerben,
  nominativ,
  habenVerben,
];

const CEFR_TO_ZONE: Record<string, OceanZone> = {
  A1: "surface",
  A2: "shallow",
  B1: "reef",
  B2: "deep",
  C1: "abyss",
  C2: "abyss",
};

async function upsertCategory(
  languageCode: string,
  cat: GrammarContentFile["path"]["category"],
  cefrLevel: CEFRLevel,
) {
  const zone = CEFR_TO_ZONE[cefrLevel] || "surface";
  const { data, error } = await supabase
    .from("grammar_categories")
    .upsert(
      {
        language_code: languageCode,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || null,
        ocean_zone: zone,
        order_index: 0,
      },
      { onConflict: "language_code,slug" },
    )
    .select()
    .single();

  if (error) throw new Error(`Category upsert failed: ${error.message}`);
  return data;
}

async function upsertTopic(
  categoryId: string,
  topic: GrammarContentFile["path"]["topic"],
) {
  const { data, error } = await supabase
    .from("grammar_topics")
    .upsert(
      {
        category_id: categoryId,
        name: topic.name,
        slug: topic.slug,
        cefr_level: topic.cefr_level,
        order_index: 0,
      },
      { onConflict: "category_id,slug" },
    )
    .select()
    .single();

  if (error) throw new Error(`Topic upsert failed: ${error.message}`);
  return data;
}

async function upsertSubtopic(
  topicId: string,
  subtopic: GrammarContentFile["path"]["subtopic"],
) {
  const { data, error } = await supabase
    .from("grammar_subtopics")
    .upsert(
      {
        topic_id: topicId,
        name: subtopic.name,
        slug: subtopic.slug,
        order_index: 0,
      },
      { onConflict: "topic_id,slug" },
    )
    .select()
    .single();

  if (error) throw new Error(`Subtopic upsert failed: ${error.message}`);
  return data;
}

async function seed() {
  console.log(`Seeding ${ALL_CONTENT.length} grammar content file(s)...\n`);

  const reachable = await checkSupabaseReachable(supabaseUrl);
  if (!reachable) {
    console.error(
      `Unable to reach Supabase at ${supabaseUrl}.\nPlease check your network, VPN, firewall, and that NEXT_PUBLIC_SUPABASE_URL is correct in .env.local. Also ensure you are running Node 18+ so that global fetch is available to the Supabase client.`,
    );
    process.exit(1);
  }

  for (const content of ALL_CONTENT) {
    const { path: p, lesson, exercises } = content;
    console.log(
      `→ ${p.language_code}/${p.category.slug}/${p.topic.slug}/${p.subtopic.slug}`,
    );

    // 1. Upsert category
    const category = await upsertCategory(
      p.language_code,
      p.category,
      p.topic.cefr_level,
    );
    console.log(`  ✓ Category: ${category.name} (${category.id})`);

    // 2. Upsert topic
    const topic = await upsertTopic(category.id, p.topic);
    console.log(`  ✓ Topic: ${topic.name} (${topic.id})`);

    // 3. Upsert subtopic
    const subtopic = await upsertSubtopic(topic.id, p.subtopic);
    console.log(`  ✓ Subtopic: ${subtopic.name} (${subtopic.id})`);

    // 4. Upsert lesson (delete existing + insert fresh)
    // First, delete existing exercises and lesson for this subtopic
    const { data: existingLessons } = await supabase
      .from("grammar_lessons")
      .select("id")
      .eq("subtopic_id", subtopic.id);

    if (existingLessons && existingLessons.length > 0) {
      const lessonIds = existingLessons.map((l: { id: string }) => l.id);
      await supabase
        .from("grammar_exercises")
        .delete()
        .in("lesson_id", lessonIds);
      await supabase
        .from("grammar_lessons")
        .delete()
        .eq("subtopic_id", subtopic.id);
    }

    const { data: lessonRow, error: lessonErr } = await supabase
      .from("grammar_lessons")
      .insert({
        subtopic_id: subtopic.id,
        language_code: p.language_code,
        title: lesson.title,
        explanation_md: lesson.explanation_md,
        summary_table_json: lesson.summary_table_json || null,
        examples: lesson.examples,
        cefr_level: lesson.cefr_level,
      })
      .select()
      .single();

    if (lessonErr)
      throw new Error(`Lesson insert failed: ${lessonErr.message}`);
    console.log(`  ✓ Lesson: ${lessonRow.title} (${lessonRow.id})`);

    // 5. Insert exercises
    const exerciseRows = exercises.map((ex, i) => ({
      lesson_id: lessonRow.id,
      language_code: p.language_code,
      type: ex.type,
      prompt: ex.prompt,
      options: ex.options || null,
      correct_answer: ex.correct_answer,
      explanation: ex.explanation,
      difficulty: ex.difficulty,
      order_index: i,
    }));

    const { error: exErr } = await supabase
      .from("grammar_exercises")
      .insert(exerciseRows);

    if (exErr) throw new Error(`Exercises insert failed: ${exErr.message}`);
    console.log(`  ✓ ${exerciseRows.length} exercises inserted`);

    console.log();
  }

  console.log("✅ Grammar seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
