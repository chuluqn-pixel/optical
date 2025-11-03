## Quick orientation

This repository is a Next.js (app router) application with Firebase as the primary backend and GenKit used for AI flows. Key directories and entry points:

- `src/app/` — Next.js app routes and server/client components. Example: `src/app/layout.tsx` (root layout) which wraps the app in `FirebaseClientProvider` and uses Firestore for metadata.
- `src/firebase/` — auto-generated and hand-written Firebase glue. Important files:
  - `src/firebase/config.ts` (AUTO-GENERATED, contains web Firebase config)
  - `src/firebase/index.ts` (initializers & re-exports)
  - `src/firebase/provider.tsx` (Firebase React context/provider)
  - `src/lib/firebase.ts` (thin client-side Firebase init used by many components)
- `src/components/ui/` — design system primitives (input, button, dialog, etc.). Follow existing variants and CVA patterns.
- `src/ai/` — GenKit-related flows (e.g., `src/ai/dev.ts`, `src/ai/genkit.ts`). GenKit and `@genkit-ai/*` packages are integrated.

## Big-picture architecture & data flow notes

- Next.js (app router) renders server components in `src/app`. Server code can import `src/lib/firebase.ts` to read Firestore during SSR (see `generateMetadata` in `src/app/layout.tsx`).
- The client uses `FirebaseClientProvider` and `FirebaseProvider` to expose `auth`, `firestore`, and `user` via `useFirebase()` hooks from `src/firebase/provider.tsx`.
- Many UI pages fetch/store data in Firestore collections (e.g., `migrated_data`) using `database` from `src/lib/firebase.ts`.
- GenKit is used for AI workflows — these are separate scripts under `src/ai/` and invoked with npm scripts (see below). Do not mix server-only Firebase admin logic into client providers.

## Developer workflows (commands)

- Start dev server on the configured port (9002):
  - `npm run dev` (equivalent to `next dev -p 9002`)
- Run GenKit AI flows locally:
  - `npm run genkit:dev` — runs `src/ai/dev.ts` (GenKit start)
  - `npm run genkit:watch` — runs GenKit in watch mode
- Build & production:
  - `npm run build` then `npm run start`
- Lint & types:
  - `npm run lint`
  - `npm run typecheck` (note: `next.config.ts` currently disables build-time type & eslint blocking)

## Project-specific conventions & gotchas

- Auto-generated files: several files include the marker `// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.` — do not modify these directly (`src/firebase/config.ts`, some firebase helpers).
- Firebase config: `src/firebase/config.ts` currently contains project keys. Prefer environment-based overrides for secrets (use `.env.local` and keep secrets out of commits).
- Next config: `next.config.ts` sets `typescript.ignoreBuildErrors = true` and `eslint.ignoreDuringBuilds = true`. Be cautious: CI may pass despite type/eslint issues.
- UI primitives follow shadcn-like patterns (CVA, Tailwind). Inspect `src/components/ui/*` for usage examples (e.g., `input.tsx`, `button.tsx`). Match prop shapes and variant names when adding components.
- Server vs client: files with `'use client'` are client-only (e.g., providers). Keep server-only logic (admin SDK usage) out of these files.

## Integration points & external dependencies

- Firebase (client): `firebase` package and web config in `src/firebase/config.ts` and `src/lib/firebase.ts`.
- Firebase Admin: `firebase-admin` is included for server-side or Cloud Function usage — search for server-only imports before using in client code.
- GenKit: packages `genkit`, `genkit-cli`, and `@genkit-ai/*` are used for AI flows. `next.config.ts` lists `serverExternalPackages: ['@genkit-ai/googleai']` to allow server-side usage.

## How to update or add features safely

- When adding a Firebase-backed page, prefer using `src/lib/firebase.ts` or `src/firebase/provider.tsx` to access Firestore and Auth rather than re-initializing apps.
- Avoid editing auto-generated files. If generator behavior must change, update the generator source under `src/ai/` or developer docs instead.
- When adding new UI primitives, follow existing CVA/variant naming and export patterns used in `src/components/ui/*` so pages can consume them interchangeably.

## Examples to reference

- Metadata fetch on the server: `src/app/layout.tsx` shows server-side Firestore read via `doc` and `getDoc` using `database`.
- Firebase provider usage: `src/firebase/provider.tsx` exposes `useFirebase()` and `useUser()` hooks used widely across components.
- GenKit entrypoint: `src/ai/dev.ts` (run via `npm run genkit:dev`).

## Final notes

Keep changes minimal to auto-generated files and prefer environment variables for secrets. If anything in this file is unclear or you'd like more detail about a particular area (e.g., GenKit flows, Firebase admin usage, or CI), tell me which area and I will expand the instructions.
