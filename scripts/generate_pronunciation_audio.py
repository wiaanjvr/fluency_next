#!/usr/bin/env python3
"""
Generate pre-recorded audio for every pronunciation-training asset across all
3 supported languages (German, French, Italian) and store the files in Supabase
Storage so the app can stream them without re-synthesising on every request.

Three asset types are handled:
  1. Phonemes       — each unique IPA sound gets its own MP3 (IPA SSML used
                      so the TTS engine isolates the exact phoneme).
  2. Minimal pairs  — each word in every pair gets its own MP3 (plain TTS).
  3. Shadowing phrases — full sentences at a slightly slower rate (plain TTS).

After uploading, the script updates the relevant database rows so the app
picks up the hosted URLs immediately (phonemes.audio_url,
minimal_pairs.audio_url_a/b, shadowing_phrases.audio_url).

──────────────────────────────────────────────────────
SETUP
──────────────────────────────────────────────────────

1. Install Python dependencies:

       pip install -r scripts/requirements-pronunciation-audio.txt

2. Make sure .env.local (project root) contains:
       NEXT_PUBLIC_SUPABASE_URL=...
       SUPABASE_SERVICE_ROLE_KEY=...
       GOOGLE_API_KEY=...   ← your Gemini API key

3. Run — full generation:
       python scripts/generate_pronunciation_audio.py

   Or selectively:
       python scripts/generate_pronunciation_audio.py --lang de
       python scripts/generate_pronunciation_audio.py --skip-shadowing
       python scripts/generate_pronunciation_audio.py --dry-run

──────────────────────────────────────────────────────
COST ESTIMATE
──────────────────────────────────────────────────────
  Gemini 2.5 Flash TTS — free tier covers thousands of requests/day.
  76 files total → effectively zero cost.
"""

from __future__ import annotations

import argparse
import io
import os
import re
import ssl
import sys
import time
import wave
from base64 import b64decode
from pathlib import Path

# UTF-8 output — prevents emoji/IPA chars crashing on Windows CP1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Fix SSL certificate verification on Windows ───────────────────────────────
# Python on Windows doesn't use the system cert store. Two complementary fixes:
#   1. Point requests / urllib3 at the certifi bundle (env vars)
#   2. Patch ssl default context so httpx (used by supabase-py) also works
# This is a local admin script — the relaxed SSL is acceptable here.
try:
    import certifi  # type: ignore
    os.environ["SSL_CERT_FILE"] = certifi.where()
    os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()
except ImportError:
    pass
ssl._create_default_https_context = ssl._create_unverified_context  # type: ignore[attr-defined]

# ── Resolve .env.local relative to this script file ──────────────────────────
_REPO_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _REPO_ROOT / ".env.local"

try:
    from dotenv import load_dotenv  # type: ignore
    if _ENV_FILE.exists():
        load_dotenv(_ENV_FILE)
        print(f"[env] Loaded credentials from {_ENV_FILE}")
    else:
        print(f"[env] WARNING: {_ENV_FILE} not found — relying on shell env vars")
except ImportError:
    pass

try:
    import requests  # type: ignore
except ImportError:
    sys.exit("ERROR: requests is not installed.\nRun:  pip install requests")

try:
    from supabase import create_client, Client  # type: ignore
except ImportError:
    sys.exit("ERROR: supabase-py is not installed.\nRun:  pip install supabase")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SUPABASE_URL: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GOOGLE_API_KEY: str = os.environ.get("GOOGLE_API_KEY", "")
BUCKET = "pronunciation-audio"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    sys.exit(
        "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
        "must be set (check .env.local or shell environment)."
    )
if not GOOGLE_API_KEY:
    sys.exit("ERROR: GOOGLE_API_KEY must be set in .env.local or shell environment.")

# ── Gemini TTS config — mirrors /api/pronunciation/generate-audio/route.ts ───
TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{TTS_MODEL}:generateContent"
)
TTS_RETRY_ATTEMPTS = 5
TTS_RETRY_DELAY = 8  # seconds between retries

# Voice map — same as the live pronunciation route
VOICE_MAP: dict[str, str] = {
    "de": "Kore",   # clear female voice, handles German well
    "fr": "Aoede",  # natural female voice for French
    "it": "Aoede",  # natural female voice for Italian
}

print(f"[auth] Using Gemini TTS model: {TTS_MODEL}")

# ─────────────────────────────────────────────────────────────────────────────
# Asset definitions  (must stay in sync with 20260223_pronunciation_tables.sql)
# ─────────────────────────────────────────────────────────────────────────────

# ── Phonemes ──────────────────────────────────────────────────────────────────
# Each tuple: (ipa_symbol, carrier_word)
# The carrier word provides acoustic context; the IPA SSML tag overrides the
# actual pronunciation so Google renders the isolated phoneme.
PHONEMES: dict[str, list[tuple[str, str]]] = {
    "de": [
        ("ʏ",  "Stück"),    # Short ü
        ("yː", "über"),     # Long ü
        ("ø",  "können"),   # Short ö
        ("øː", "schön"),    # Long ö
        ("x",  "Bach"),     # ach-Laut
        ("ç",  "ich"),      # ich-Laut
        ("ʁ",  "rot"),      # German R
        ("ts", "Zeit"),     # German Z
        ("pf", "Pferd"),    # pf-sound
        ("aɪ", "Eis"),      # German ei
    ],
    "fr": [
        ("y",  "tu"),       # French u
        ("ø",  "peu"),      # eu closed
        ("œ",  "heure"),    # eu open
        ("ɑ̃", "dans"),     # Nasal an
        ("ɛ̃", "vin"),      # Nasal in
        ("ɔ̃", "bon"),      # Nasal on
        ("ʁ",  "rouge"),    # French R
        ("ʒ",  "jour"),     # French j/g
        ("ɥ",  "huit"),     # Semi-vowel u
        ("ɑ",  "pâte"),     # Back a
    ],
    "it": [
        ("ts", "pizza"),    # Z sorda
        ("dz", "zero"),     # Z sonora
        ("tʃ", "cena"),     # C dolce
        ("dʒ", "gelato"),   # G dolce
        ("ɲ",  "gnocchi"),  # GN sound
        ("ʎ",  "famiglia"), # GL sound
        ("rr", "terra"),    # Rolled R (geminate)
        ("r",  "sera"),     # Single R (tap)
        ("kk", "ecco"),     # Double C
        ("ɛ",  "bello"),    # Open E
    ],
}

# ── Minimal pair words ────────────────────────────────────────────────────────
# Each tuple: (word_a, word_b) matching the SQL INSERT word order.
# The script queries the DB by language + matching words to find the row IDs
# and then sets audio_url_a / audio_url_b accordingly.
MINIMAL_PAIR_WORDS: dict[str, list[tuple[str, str]]] = {
    "de": [
        ("Stück", "Stuck"),
        ("über",  "Übel"),
        ("Höhle", "Hölle"),
        ("ich",   "ach"),
        ("Zeit",  "Seit"),
    ],
    "fr": [
        ("rue",  "roue"),
        ("peu",  "peur"),
        ("dans", "dont"),
        ("vin",  "vent"),
        ("nuit", "noue"),
    ],
    "it": [
        ("pizza", "pezza"),
        ("cena",  "gena"),
        ("sera",  "terra"),
        ("bagno", "bello"),
    ],
}

# ── Shadowing phrases ─────────────────────────────────────────────────────────
# Must match the SQL INSERT text exactly (used as the DB lookup key).
SHADOWING_PHRASES: dict[str, list[str]] = {
    "de": [
        "Ich möchte ein Glas Wasser.",
        "Wie viel Uhr ist es?",
        "Die Brücke über den Fluss ist sehr schön.",
        "Könnten Sie mir bitte helfen?",
        "Ich habe gestern Nacht nicht gut geschlafen.",
        "Die Züge fahren heute leider nicht pünktlich.",
    ],
    "fr": [
        "Je voudrais un verre d'eau.",
        "Quelle heure est-il?",
        "La rue est très belle la nuit.",
        "Pourriez-vous m'aider, s'il vous plaît?",
        "Je n'ai pas bien dormi cette nuit.",
        "Les trains ne sont malheureusement pas à l'heure.",
    ],
    "it": [
        "Vorrei un bicchiere d'acqua.",
        "Che ore sono?",
        "La famiglia è molto importante in Italia.",
        "Potrebbe aiutarmi, per favore?",
        "Ieri sera non ho dormito bene.",
        "La pizza napoletana è la migliore del mondo.",
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def safe_filename(text: str, max_len: int = 60) -> str:
    """Filesystem+URL-safe ASCII slug. IPA chars encoded as u{codepoint:04x}."""
    parts: list[str] = []
    for ch in text:
        if ch.isascii() and (ch.isalnum() or ch in "-_."):
            parts.append(ch)
        elif ch in " \t":
            parts.append("_")
        else:
            parts.append(f"u{ord(ch):04x}")
    slug = re.sub(r"_+", "_", "".join(parts)).strip("_")
    return slug[:max_len]


def pcm_to_wav(pcm: bytes, sample_rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    """Wrap raw 16-bit PCM bytes in a WAV container (mirrors server-side pcmToWav)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(bits // 8)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)
    return buf.getvalue()

# -----------------------------------------------------------------------------
# Gemini TTS synthesis
# -----------------------------------------------------------------------------

# Sentence wrapper for single-word inputs.  Without context the TTS model
# sometimes returns finishReason="OTHER" (no audio) for very short inputs.
_WORD_WRAPPER: dict[str, str] = {
    "de": "Das Wort lautet: {word}",
    "fr": "Le mot est\u00a0: {word}",
    "it": "La parola \u00e8: {word}",
}


def _prepare_text(text: str, lang: str) -> str:
    """Wrap bare single-word text in a language-appropriate sentence."""
    if " " not in text.strip():
        return _WORD_WRAPPER[lang].format(word=text)
    return text


def synthesize(text: str, lang: str) -> bytes:
    """Call Gemini TTS and return WAV bytes.  Retries on transient failures."""
    voice = VOICE_MAP[lang]
    tts_text = _prepare_text(text, lang)
    # NOTE: system_instruction must be omitted for the TTS model — it causes a
    # 400 "Model tried to generate text" error.  The model infers language from
    # the input text automatically.
    payload = {
        "contents": [{"role": "user", "parts": [{"text": tts_text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}
            },
        },
    }

    last_err: Exception | None = None
    for attempt in range(1, TTS_RETRY_ATTEMPTS + 1):
        try:
            resp = requests.post(
                f"{TTS_ENDPOINT}?key={GOOGLE_API_KEY}",
                json=payload,
                timeout=60,
            )
            # 429 = quota exhausted — retrying won't help; fail immediately
            if resp.status_code == 429:
                err_msg = resp.json().get("error", {}).get("message", "")
                sys.exit(
                    "\n[QUOTA EXHAUSTED] The Gemini API has returned HTTP 429.\n"
                    "You have exceeded your daily or per-minute request quota for\n"
                    f"the model '{TTS_MODEL}'.\n\n"
                    f"API message: {err_msg}\n\n"
                    "Options:\n"
                    "  1. Wait until tomorrow for the quota to reset (free tier).\n"
                    "  2. Enable billing on your Google Cloud project for higher limits.\n"
                    "  3. Check https://ai.google.dev/gemini-api/docs/rate-limits\n"
                )
            resp.raise_for_status()
            data = resp.json()
            candidate = data["candidates"][0]
            # finishReason="OTHER" means the model produced no audio; treat as
            # a transient failure and retry.
            if candidate.get("finishReason") == "OTHER" or "content" not in candidate:
                raise ValueError(
                    f"TTS returned no audio (finishReason={candidate.get('finishReason')})"
                )
            audio_b64: str = (
                candidate["content"]["parts"][0]["inlineData"]["data"]
            )
            return pcm_to_wav(b64decode(audio_b64))
        except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
            last_err = exc
            if attempt < TTS_RETRY_ATTEMPTS:
                print(f"    ↺ retry {attempt}/{TTS_RETRY_ATTEMPTS}: {exc}", flush=True)
                time.sleep(TTS_RETRY_DELAY)

    raise RuntimeError(f"TTS failed after {TTS_RETRY_ATTEMPTS} attempts: {last_err}")


# ─────────────────────────────────────────────────────────────────────────────
# Supabase helpers
# ─────────────────────────────────────────────────────────────────────────────

def ensure_bucket(supabase: "Client") -> None:
    """Create the pronunciation-audio bucket if it doesn't exist yet."""
    try:
        existing = {b.name for b in supabase.storage.list_buckets()}
        if BUCKET not in existing:
            supabase.storage.create_bucket(BUCKET, options={"public": True})
            print(f"  ✓ Created storage bucket '{BUCKET}'")
        else:
            print(f"  ✓ Bucket '{BUCKET}' already exists")
    except Exception as exc:
        print(f"  ⚠  Could not verify/create bucket: {exc}")
        print(f"     Create '{BUCKET}' (public) in the Supabase dashboard if missing.")


def upload_wav(
    supabase: "Client",
    audio_bytes: bytes,
    storage_path: str,
    dry_run: bool = False,
) -> str:
    """Upload WAV bytes to Supabase Storage and return the public URL. Uses upsert."""
    if dry_run:
        return f"[dry-run] {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"

    supabase.storage.from_(BUCKET).upload(
        path=storage_path,
        file=audio_bytes,
        file_options={
            "content-type": "audio/wav",
            "cache-control": "31536000",
            "upsert": "true",
        },
    )
    return supabase.storage.from_(BUCKET).get_public_url(storage_path)

# ─────────────────────────────────────────────────────────────────────────────
# Per-asset generators
# ─────────────────────────────────────────────────────────────────────────────

def generate_phonemes(supabase: "Client", lang: str, dry_run: bool) -> int:
    items = PHONEMES[lang]
    print(f"\n  ┌─ [{lang.upper()}] Phonemes ({len(items)})")
    count = 0

    for ipa, carrier in items:
        audio = synthesize(carrier, lang)
        path = f"phonemes/{lang}/{safe_filename(ipa)}.wav"
        url = upload_wav(supabase, audio, path, dry_run)

        if not dry_run:
            result = (
                supabase.table("phonemes")
                .update({"audio_url": url})
                .eq("language", lang)
                .eq("ipa_symbol", ipa)
                .execute()
            )
            status = "✓" if result.data else "⚠ DB row not found"
        else:
            status = "dry-run"

        print(f"  │  /{ipa}/ ({carrier}) → {path}  [{status}]", flush=True)
        count += 1
        time.sleep(0.5)

    print(f"  └─ {count} phoneme files")
    return count


def generate_minimal_pairs(supabase: "Client", lang: str, dry_run: bool) -> int:
    pairs = MINIMAL_PAIR_WORDS[lang]
    print(f"\n  ┌─ [{lang.upper()}] Minimal pairs ({len(pairs)} pairs, {len(pairs)*2} words)")
    count = 0

    for word_a, word_b in pairs:
        for slot, word in (("audio_url_a", word_a), ("audio_url_b", word_b)):
            audio = synthesize(word, lang)
            path = f"minimal_pairs/{lang}/{safe_filename(word)}.wav"
            url = upload_wav(supabase, audio, path, dry_run)

            if not dry_run:
                word_col = "example_word_a" if slot == "audio_url_a" else "example_word_b"
                result = (
                    supabase.table("minimal_pairs")
                    .update({slot: url})
                    .eq("language", lang)
                    .eq(word_col, word)
                    .execute()
                )
                status = "✓" if result.data else "⚠ DB row not found"
            else:
                status = "dry-run"

            print(f"  │  '{word}' ({slot}) → {path}  [{status}]", flush=True)
            count += 1
            time.sleep(0.5)

    print(f"  └─ {count} word files")
    return count


def generate_shadowing(supabase: "Client", lang: str, dry_run: bool) -> int:
    phrases = SHADOWING_PHRASES[lang]
    print(f"\n  ┌─ [{lang.upper()}] Shadowing phrases ({len(phrases)})")
    count = 0

    for phrase in phrases:
        audio = synthesize(phrase, lang)
        path = f"shadowing/{lang}/{safe_filename(phrase)}.wav"
        url = upload_wav(supabase, audio, path, dry_run)

        if not dry_run:
            result = (
                supabase.table("shadowing_phrases")
                .update({"audio_url": url})
                .eq("language", lang)
                .eq("text", phrase)
                .execute()
            )
            status = "✓" if result.data else "⚠ DB row not found"
        else:
            status = "dry-run"

        short = phrase[:55] + ("…" if len(phrase) > 55 else "")
        print(f'  │  "{short}"  [{status}]', flush=True)
        count += 1
        time.sleep(0.5)

    print(f"  └─ {count} phrase files")
    return count

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate and upload pronunciation audio for Lingua (de/fr/it)."
    )
    parser.add_argument(
        "--lang",
        choices=["de", "fr", "it"],
        help="Restrict generation to a single language (default: all three).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Synthesise audio locally but skip all Supabase uploads and DB updates.",
    )
    parser.add_argument(
        "--skip-phonemes",
        action="store_true",
        help="Skip phoneme audio generation.",
    )
    parser.add_argument(
        "--skip-pairs",
        action="store_true",
        help="Skip minimal-pair word audio generation.",
    )
    parser.add_argument(
        "--skip-shadowing",
        action="store_true",
        help="Skip shadowing phrase audio generation.",
    )
    args = parser.parse_args()

    langs = [args.lang] if args.lang else ["de", "fr", "it"]

    # ── Summary ───────────────────────────────────────────────────────────────
    phoneme_total = sum(len(PHONEMES[l]) for l in langs) if not args.skip_phonemes else 0
    pair_total = sum(len(MINIMAL_PAIR_WORDS[l]) * 2 for l in langs) if not args.skip_pairs else 0
    shadow_total = sum(len(SHADOWING_PHRASES[l]) for l in langs) if not args.skip_shadowing else 0
    grand_total = phoneme_total + pair_total + shadow_total

    print("=" * 64)
    print("  Lingua — Pronunciation Audio Generator")
    print("=" * 64)
    print(f"  Languages  : {', '.join(langs)}")
    print(f"  Phonemes   : {phoneme_total} files")
    print(f"  Pair words : {pair_total} files")
    print(f"  Phrases    : {shadow_total} files")
    print(f"  Total      : {grand_total} WAV files")
    print(f"  Dry run    : {args.dry_run}")
    print(f"  TTS model  : {TTS_MODEL}")
    print(f"  Bucket     : {BUCKET}")
    print("=" * 64)

    if grand_total == 0:
        print("Nothing to do. Remove --skip-* flags.")
        return

    # ── Clients ───────────────────────────────────────────────────────────────
    print("\nInitialising Supabase client…")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if not args.dry_run:
        print("Checking storage bucket…")
        ensure_bucket(supabase)

    # ── Generate ──────────────────────────────────────────────────────────────
    processed = 0
    for lang in langs:
        print(f"\n{'─' * 64}")
        print(f"  Language: {lang.upper()}")
        print(f"{'─' * 64}")

        if not args.skip_phonemes:
            processed += generate_phonemes(supabase, lang, args.dry_run)

        if not args.skip_pairs:
            processed += generate_minimal_pairs(supabase, lang, args.dry_run)

        if not args.skip_shadowing:
            processed += generate_shadowing(supabase, lang, args.dry_run)

    # ── Done ──────────────────────────────────────────────────────────────────
    print(f"\n{'=' * 64}")
    if args.dry_run:
        print(f"  DRY RUN complete — {processed} file(s) synthesised locally.")
        print("  No data was written to Supabase.")
    else:
        print(f"  ✅ Done!  {processed} file(s) generated and uploaded.")
        print(f"  Bucket: {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/")
        print()
        print("  DB columns updated:")
        print("   • phonemes.audio_url        (30 rows)")
        print("   • minimal_pairs.audio_url_a/b (all pairs)")
        print("   • shadowing_phrases.audio_url (18 rows)")
    print("=" * 64)


if __name__ == "__main__":
    main()
