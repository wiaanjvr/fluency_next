# Fluency Next

A listening-first language acquisition platform for solo learners.

## Philosophy

Lingua treats language learning like athletic training—through intelligent, personalized exposure that respects how humans actually acquire languages. We prioritize:

- **Listening** as primary input
- **Speaking** as primary output
- **Comprehensible input** at the right difficulty level
- **Spaced repetition** through natural re-encounter, not flashcards
- **Interest-aligned content** (philosophy, fitness, science, etc.)
- **Implicit acquisition** over explicit grammar instruction

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth, database, storage)
- **Zustand** (state management)
- **Vercel** (deployment)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Reusable UI primitives
│   └── learning/    # Learning-specific components
├── lib/             # Utilities and configurations
│   ├── supabase/    # Database client and queries
│   ├── content/     # Content engine
│   └── store/       # State management
├── types/           # TypeScript definitions
└── styles/          # Global styles
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Deployment

Deploy to Vercel with one click or via CLI:

```bash
vercel
```

## License

Proprietary
