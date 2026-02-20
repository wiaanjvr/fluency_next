/**
 * GET /api/ambient/radio
 *
 * Returns radio stations for the authenticated user's target language.
 * If fewer than 5 active stations exist in Supabase, fetches fresh ones
 * from radio-browser.info and upserts them.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Maps ISO 639-1 codes → English language names used by radio-browser.info
const LANGUAGE_NAME_MAP: Record<string, string> = {
  af: "afrikaans",
  ar: "arabic",
  bg: "bulgarian",
  bn: "bengali",
  ca: "catalan",
  cs: "czech",
  cy: "welsh",
  da: "danish",
  de: "german",
  el: "greek",
  en: "english",
  eo: "esperanto",
  es: "spanish",
  et: "estonian",
  eu: "basque",
  fa: "persian",
  fi: "finnish",
  fr: "french",
  ga: "irish",
  gl: "galician",
  gu: "gujarati",
  he: "hebrew",
  hi: "hindi",
  hr: "croatian",
  hu: "hungarian",
  hy: "armenian",
  id: "indonesian",
  it: "italian",
  ja: "japanese",
  ka: "georgian",
  kn: "kannada",
  ko: "korean",
  lt: "lithuanian",
  lv: "latvian",
  mk: "macedonian",
  ml: "malayalam",
  mr: "marathi",
  ms: "malay",
  mt: "maltese",
  nb: "norwegian",
  nl: "dutch",
  pa: "punjabi",
  pl: "polish",
  pt: "portuguese",
  ro: "romanian",
  ru: "russian",
  sk: "slovak",
  sl: "slovenian",
  sq: "albanian",
  sr: "serbian",
  sv: "swedish",
  sw: "swahili",
  ta: "tamil",
  te: "telugu",
  th: "thai",
  tr: "turkish",
  uk: "ukrainian",
  ur: "urdu",
  vi: "vietnamese",
  zh: "chinese",
  zu: "zulu",
};

export interface RadioStation {
  id: string;
  name: string;
  stream_url: string;
  country: string;
  bitrate: number;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch target language from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const languageCode = profile?.target_language || "fr";

    // Check how many active stations we already have
    const { data: existing, error: fetchError } = await supabase
      .from("radio_stations")
      .select("id, name, stream_url, country, bitrate")
      .eq("language_code", languageCode)
      .eq("is_active", true)
      .limit(20);

    if (!fetchError && existing && existing.length >= 5) {
      return NextResponse.json({ stations: existing as RadioStation[] });
    }

    // Not enough stations — fetch from radio-browser.info
    const languageName = LANGUAGE_NAME_MAP[languageCode] ?? languageCode;

    const rbRes = await fetch(
      `https://de1.api.radio-browser.info/json/stations/bylanguage/${encodeURIComponent(languageName)}?limit=20&hidebroken=true&order=clickcount&reverse=true`,
      { next: { revalidate: 3600 } },
    );

    if (!rbRes.ok) {
      // Return whatever we have even if < 5
      return NextResponse.json({ stations: existing ?? [] });
    }

    const rbStations: Array<{
      stationuuid: string;
      name: string;
      url_resolved: string;
      countrycode: string;
      bitrate: number;
    }> = await rbRes.json();

    if (!Array.isArray(rbStations) || rbStations.length === 0) {
      return NextResponse.json({ stations: existing ?? [] });
    }

    // Upsert into radio_stations (stream_url is unique key per the spec)
    const upsertRows = rbStations
      .filter((s) => s.url_resolved)
      .map((s) => ({
        language_code: languageCode,
        name: s.name || "Unknown Station",
        stream_url: s.url_resolved,
        country: s.countrycode || "",
        bitrate: s.bitrate || 0,
        is_active: true,
        last_checked: new Date().toISOString(),
      }));

    await supabase
      .from("radio_stations")
      .upsert(upsertRows, {
        onConflict: "stream_url",
        ignoreDuplicates: false,
      });

    // Re-fetch after upsert
    const { data: refreshed } = await supabase
      .from("radio_stations")
      .select("id, name, stream_url, country, bitrate")
      .eq("language_code", languageCode)
      .eq("is_active", true)
      .limit(20);

    return NextResponse.json({ stations: (refreshed ?? []) as RadioStation[] });
  } catch (err) {
    console.error("[ambient/radio] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
