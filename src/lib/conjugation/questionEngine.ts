// ==========================================================================
// Verb Conjugation Drill — Question Engine
// ==========================================================================

import type {
  ConjugationForm,
  ConjugationVerb,
  ConjugationProgress,
  DrillQuestion,
  Language,
  SessionConfig,
} from "@/types/conjugation";

/**
 * Build a weighted question queue for a drill session.
 *
 * Forms with lower production_score get higher weight so the user
 * practises weaker verb+tense+pronoun combinations more often.
 */
export function buildQuestionQueue(
  forms: ConjugationForm[],
  verbs: ConjugationVerb[],
  progress: ConjugationProgress[],
  config: SessionConfig,
  targetCount: number = 20,
): DrillQuestion[] {
  const verbMap = new Map(verbs.map((v) => [v.id, v]));

  // Build a progress lookup: "verbId|tense|pronounKey" → production_score
  const progressMap = new Map(
    progress.map((p) => [
      `${p.verb_id}|${p.tense}|${p.pronoun_key}`,
      p.production_score,
    ]),
  );

  // Filter forms by session config
  const filtered = forms.filter((f) => {
    if (!config.tenses.includes(f.tense)) return false;
    if (!config.pronounKeys.includes(f.pronoun_key)) return false;
    if (config.verbIds.length > 0 && !config.verbIds.includes(f.verb_id))
      return false;
    return true;
  });

  if (filtered.length === 0) return [];

  // Assign weights to each eligible form
  const weighted: { form: ConjugationForm; weight: number }[] = filtered.map(
    (form) => {
      const key = `${form.verb_id}|${form.tense}|${form.pronoun_key}`;
      const score = progressMap.get(key);

      let weight: number;
      if (config.useWeightedSelection) {
        if (score === undefined) {
          // No progress data — treat as partially unknown
          weight = 0.7;
        } else {
          // Formula: weight = 1.0 - (production_score * 0.9)
          // Minimum weight = 0.1 (even mastered forms appear occasionally)
          weight = Math.max(0.1, 1.0 - score * 0.9);
        }
      } else {
        // Uniform weight when weighted selection is off
        weight = 1.0;
      }

      return { form, weight };
    },
  );

  // Weighted sampling without full replacement — pick targetCount questions
  const questions: DrillQuestion[] = [];
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

  // If we have fewer unique forms than targetCount, we'll cycle through them
  const effectiveTarget = Math.min(
    targetCount === 0 ? filtered.length : targetCount,
    // Allow repeats if target > available, but cap at 3x the pool size
    filtered.length * 3,
  );

  const usedIndices = new Set<number>();
  let attempts = 0;
  const maxAttempts = effectiveTarget * 10;

  while (questions.length < effectiveTarget && attempts < maxAttempts) {
    attempts++;

    // Weighted random pick
    let rand = Math.random() * totalWeight;
    let selectedIdx = 0;

    for (let i = 0; i < weighted.length; i++) {
      rand -= weighted[i].weight;
      if (rand <= 0) {
        selectedIdx = i;
        break;
      }
    }

    // Avoid consecutive duplicates (same exact form back-to-back)
    if (questions.length > 0) {
      const lastQ = questions[questions.length - 1];
      const candidate = weighted[selectedIdx].form;
      if (
        lastQ.verbId === candidate.verb_id &&
        lastQ.tense === candidate.tense &&
        lastQ.pronounKey === candidate.pronoun_key
      ) {
        continue;
      }
    }

    // In first pass, prefer unique forms
    if (questions.length < filtered.length && usedIndices.has(selectedIdx)) {
      // Try to pick an unused form instead (limited retries)
      let found = false;
      for (let retry = 0; retry < 5; retry++) {
        let r2 = Math.random() * totalWeight;
        let idx2 = 0;
        for (let i = 0; i < weighted.length; i++) {
          r2 -= weighted[i].weight;
          if (r2 <= 0) {
            idx2 = i;
            break;
          }
        }
        if (!usedIndices.has(idx2)) {
          selectedIdx = idx2;
          found = true;
          break;
        }
      }
      if (!found && questions.length < filtered.length) continue;
    }

    usedIndices.add(selectedIdx);
    const { form, weight } = weighted[selectedIdx];
    const verb = verbMap.get(form.verb_id);

    questions.push({
      questionId: `q-${questions.length}-${form.id}`,
      verbId: form.verb_id,
      infinitive: verb?.infinitive ?? "",
      englishMeaning: verb?.english_meaning ?? "",
      tense: form.tense,
      mood: form.mood,
      pronoun: form.pronoun,
      pronounKey: form.pronoun_key,
      correctForm: form.conjugated_form,
      ruleExplanation: form.rule_explanation ?? undefined,
      weight,
    });
  }

  // Shuffle the final queue with Fisher-Yates
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
}

/**
 * Validate a user's answer against the correct conjugated form.
 *
 * Accent-strict by default (matches Conjuguemos behaviour).
 * Trims whitespace and compares case-insensitively.
 */
export function validateAnswer(
  userAnswer: string,
  correctForm: string,
  _language: Language,
): { isCorrect: boolean; normalizedUser: string; normalizedCorrect: string } {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctForm.trim().toLowerCase();

  return {
    isCorrect: normalizedUser === normalizedCorrect,
    normalizedUser,
    normalizedCorrect,
  };
}

/**
 * Generate a hint string at the given level.
 *
 * Level 1: first letter + underscores (e.g. "s_ _ _ _ _t")
 * Level 2: full correct answer
 */
export function generateHint(correctForm: string, level: 0 | 1 | 2): string {
  if (level === 0) return "";
  if (level === 2) return correctForm;

  // Level 1: reveal first and last letter, underscores in between
  const chars = correctForm.split("");
  if (chars.length <= 2) return correctForm;

  return (
    chars[0] +
    chars
      .slice(1, -1)
      .map((c) => (c === " " ? " " : "_"))
      .join(" ") +
    chars[chars.length - 1]
  );
}

/**
 * Calculate XP earned for a completed session.
 *
 * Base: 2 XP per correct answer
 * Accuracy bonus: +10 XP if accuracy >= 90%
 * Speed bonus: +5 XP if timed mode completed with >60s remaining
 */
export function calculateXP(
  correct: number,
  total: number,
  timed: boolean,
  timeBonus: boolean,
): number {
  if (total === 0) return 0;

  let xp = correct * 2;

  const accuracy = correct / total;
  if (accuracy >= 0.9) {
    xp += 10;
  }

  if (timed && timeBonus) {
    xp += 5;
  }

  return xp;
}

/**
 * Compute per-verb and per-tense breakdowns from a list of drill answers.
 */
export function computeSessionResult(
  answers: {
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    hintUsed: boolean;
    timeSpentMs: number;
  }[],
  questions: DrillQuestion[],
  timed: boolean,
  timeTakenSeconds: number,
  durationSeconds: number,
): {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeTakenSeconds: number;
  xpEarned: number;
  weakestVerbs: { infinitive: string; accuracy: number }[];
  strongestVerbs: { infinitive: string; accuracy: number }[];
  tenseBreakdown: { tense: string; correct: number; total: number }[];
} {
  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const accuracy =
    totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  const timeBonus = timed && durationSeconds - timeTakenSeconds > 60;
  const xpEarned = calculateXP(
    correctAnswers,
    totalQuestions,
    timed,
    timeBonus,
  );

  // Build question lookup
  const questionMap = new Map(questions.map((q) => [q.questionId, q]));

  // Per-verb accuracy
  const verbStats = new Map<
    string,
    { infinitive: string; correct: number; total: number }
  >();
  for (const answer of answers) {
    const q = questionMap.get(answer.questionId);
    if (!q) continue;
    const key = q.verbId;
    const existing = verbStats.get(key) ?? {
      infinitive: q.infinitive,
      correct: 0,
      total: 0,
    };
    existing.total++;
    if (answer.isCorrect) existing.correct++;
    verbStats.set(key, existing);
  }

  const verbAccuracies = Array.from(verbStats.values()).map((v) => ({
    infinitive: v.infinitive,
    accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  verbAccuracies.sort((a, b) => a.accuracy - b.accuracy);
  const weakestVerbs = verbAccuracies.slice(0, 5);
  const strongestVerbs = [...verbAccuracies]
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  // Per-tense breakdown
  const tenseStats = new Map<string, { correct: number; total: number }>();
  for (const answer of answers) {
    const q = questionMap.get(answer.questionId);
    if (!q) continue;
    const existing = tenseStats.get(q.tense) ?? { correct: 0, total: 0 };
    existing.total++;
    if (answer.isCorrect) existing.correct++;
    tenseStats.set(q.tense, existing);
  }

  const tenseBreakdown = Array.from(tenseStats.entries())
    .map(([tense, stats]) => ({ tense, ...stats }))
    .sort((a, b) => {
      const accA = a.total > 0 ? a.correct / a.total : 0;
      const accB = b.total > 0 ? b.correct / b.total : 0;
      return accA - accB;
    });

  return {
    totalQuestions,
    correctAnswers,
    accuracy: Math.round(accuracy * 100) / 100,
    timeTakenSeconds,
    xpEarned,
    weakestVerbs,
    strongestVerbs,
    tenseBreakdown,
  };
}
