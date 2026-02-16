#!/usr/bin/env python3
"""
Generate audio files for Lingua Placement Test in all languages using OpenAI TTS
Run this script to create the 5 audio clips for each language's placement assessment.

Usage:
  python scripts/generate_placement_audio_all.py

Requirements:
  - OpenAI API key in .env.local file or OPENAI_API_KEY environment variable
  - pip install openai python-dotenv
"""

import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
import ssl
import httpx
import warnings

# Suppress SSL warnings for local development
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables from .env.local
dotenv_path = Path(__file__).parent.parent / '.env.local'
if dotenv_path.exists():
    load_dotenv(dotenv_path)
    print(f"✓ Loaded API key from {dotenv_path}")
else:
    print(f"⚠ No .env.local file found at {dotenv_path}")
    print("  Using OPENAI_API_KEY environment variable if set")

# Initialize OpenAI client with SSL verification disabled (for local dev only)
try:
    # Create a custom HTTP client that doesn't verify SSL (local dev workaround)
    http_client = httpx.Client(
        verify=False,  # Disable SSL verification for local dev
        timeout=60.0
    )
    client = OpenAI(http_client=http_client)
    print("✓ OpenAI client initialized (SSL verification disabled for local use)")
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nTo fix this:")
    print("1. Copy .env.local.example to .env.local")
    print("2. Add your OpenAI API key to the OPENAI_API_KEY field")
    print("3. Get your key from: https://platform.openai.com/api-keys")
    exit(1)

# Placement test audio content for all languages
# Each should be about 10 seconds when read naturally
placement_audio = {
    "fr": {
        "voice": "nova",  # Female voice for French
        "output_dir": "public/audio/placement",
        "items": [
            {
                "id": "audio-a1",
                "filename": "audio-a1.mp3",
                "difficulty": "A1",
                "text": "Bonjour, je m'appelle Marie. J'ai vingt ans.",
            },
            {
                "id": "audio-a2",
                "filename": "audio-a2.mp3",
                "difficulty": "A2",
                "text": "Ce matin, je suis allé au marché pour acheter des fruits et des légumes.",
            },
            {
                "id": "audio-b1",
                "filename": "audio-b1.mp3",
                "difficulty": "B1",
                "text": "Le rapport indique que les ventes ont augmenté de quinze pour cent ce trimestre par rapport à l'année dernière.",
            },
            {
                "id": "audio-b2",
                "filename": "audio-b2.mp3",
                "difficulty": "B2",
                "text": "Bien que la situation économique soit préoccupante, les experts estiment qu'une reprise progressive est envisageable d'ici la fin de l'année.",
            },
            {
                "id": "audio-c1",
                "filename": "audio-c1.mp3",
                "difficulty": "C1",
                "text": "L'émergence des technologies disruptives a fondamentalement bouleversé les paradigmes traditionnels qui régissaient jusqu'alors le secteur industriel.",
            },
        ]
    },
    "de": {
        "voice": "nova",  # Female voice for German
        "output_dir": "public/audio/placement/de",
        "items": [
            {
                "id": "audio-a1",
                "filename": "audio-a1.mp3",
                "difficulty": "A1",
                "text": "Hallo, ich heiße Marie. Ich bin zwanzig Jahre alt.",
            },
            {
                "id": "audio-a2",
                "filename": "audio-a2.mp3",
                "difficulty": "A2",
                "text": "Heute Morgen bin ich zum Markt gegangen, um Obst und Gemüse zu kaufen.",
            },
            {
                "id": "audio-b1",
                "filename": "audio-b1.mp3",
                "difficulty": "B1",
                "text": "Der Bericht zeigt, dass die Verkäufe in diesem Quartal um fünfzehn Prozent im Vergleich zum Vorjahr gestiegen sind.",
            },
            {
                "id": "audio-b2",
                "filename": "audio-b2.mp3",
                "difficulty": "B2",
                "text": "Obwohl die wirtschaftliche Lage besorgniserregend ist, sind die Experten der Meinung, dass eine schrittweise Erholung bis Ende des Jahres möglich ist.",
            },
            {
                "id": "audio-c1",
                "filename": "audio-c1.mp3",
                "difficulty": "C1",
                "text": "Das Aufkommen disruptiver Technologien hat die traditionellen Paradigmen, die bisher den Industriesektor beherrschten, grundlegend verändert.",
            },
        ]
    },
    "it": {
        "voice": "nova",  # Female voice for Italian
        "output_dir": "public/audio/placement/it",
        "items": [
            {
                "id": "audio-a1",
                "filename": "audio-a1.mp3",
                "difficulty": "A1",
                "text": "Ciao, mi chiamo Maria. Ho venti anni.",
            },
            {
                "id": "audio-a2",
                "filename": "audio-a2.mp3",
                "difficulty": "A2",
                "text": "Stamattina sono andato al mercato per comprare frutta e verdura.",
            },
            {
                "id": "audio-b1",
                "filename": "audio-b1.mp3",
                "difficulty": "B1",
                "text": "Il rapporto indica che le vendite sono aumentate del quindici per cento questo trimestre rispetto all'anno scorso.",
            },
            {
                "id": "audio-b2",
                "filename": "audio-b2.mp3",
                "difficulty": "B2",
                "text": "Nonostante la situazione economica sia preoccupante, gli esperti ritengono che una ripresa graduale sia possibile entro la fine dell'anno.",
            },
            {
                "id": "audio-c1",
                "filename": "audio-c1.mp3",
                "difficulty": "C1",
                "text": "L'emergere delle tecnologie dirompenti ha fondamentalmente sconvolto i paradigmi tradizionali che fino ad ora governavano il settore industriale.",
            },
        ]
    }
}

print("=" * 70)
print("Generating Placement Test Audio Files for All Languages")
print("=" * 70)

# Process each language
for lang_code, lang_data in placement_audio.items():
    language_name = {"fr": "French", "de": "German", "it": "Italian"}[lang_code]
    
    print(f"\n{'=' * 70}")
    print(f"Processing {language_name} ({lang_code})")
    print(f"{'=' * 70}")
    
    # Create output directory
    output_dir = lang_data["output_dir"]
    os.makedirs(output_dir, exist_ok=True)
    print(f"✓ Output directory: {output_dir}")
    
    # Generate audio files
    for item in lang_data["items"]:
        print(f"\n[{item['difficulty']}] Generating {item['filename']}...")
        print(f"    Text: {item['text'][:60]}...")
        
        # Generate speech using OpenAI TTS
        output_path = os.path.join(output_dir, item['filename'])
        
        try:
            with client.audio.speech.with_streaming_response.create(
                model="tts-1",  # or "tts-1-hd" for higher quality
                voice=lang_data["voice"],
                input=item['text'],
                speed=0.9  # Slightly slower for learners
            ) as response:
                response.stream_to_file(output_path)
            
            # Get file size
            file_size = os.path.getsize(output_path)
            print(f"    ✓ Created {output_path} ({file_size / 1024:.1f} KB)")
        except Exception as e:
            print(f"    ❌ Error generating {item['filename']}: {e}")

print("\n" + "=" * 70)
print("✅ All placement test audio files generated!")
print("=" * 70)
print("\nSummary:")
print(f"  French:  public/audio/placement/")
print(f"  German:  public/audio/placement/de/")
print(f"  Italian: public/audio/placement/it/")
print("=" * 70)
