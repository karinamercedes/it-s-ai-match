# It's A(I) Match — prototype, phase one

React (Vite) front end + Vercel serverless functions in `/api`.
API keys only live on the server; the browser never sees them. Nothing is stored.

## Flow
Intro + consent → house rules → about you (I am / interested in / looking for, one screen)
→ 5 voice-note questions, one screen each (ElevenLabs transcribes, Claude tidies, you confirm/edit, or type)
→ "It's a match": your profile and your match's side by side (the match is invented by AI answering the same
five questions as someone of the gender you're into, looking for the same thing; it never sees your answers)
→ your voice is cloned from your voice notes (ElevenLabs instant clone) → ~2 min AI-to-AI phone call
(phone-line filter, pause only) → clone deleted → match / no match, which voices were used, transcript.
If you typed your answers (or cloning fails) your AI uses a stock voice and the screen says so.

## Where things live
- `api/_prompts.js` — **the creative part**: the shared instructions both AIs get, the prompt that invents the match,
  the profile summary, the tidy prompt and the verdict prompt.
- `src/config.js` — the 5 questions, the 4 stock voices (id, style, note), call length, minimum seconds to clone.
- `src/components/` — one file per screen.

## Run it
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the two keys.
3. `npm run dev` → http://localhost:5173 (the /api functions run inside Vite, no `vercel dev` needed).
4. On your phone: `npm run phone`, then open the **Network** https address it prints, on the same Wi-Fi.
   Accept the certificate warning once (Advanced → Proceed / Show details → visit website).
   HTTPS is what lets the phone use the microphone.
5. Deploy: push to GitHub → import in Vercel (framework: Vite) → add the env vars → Deploy.

## Layout
Every step is one full screen; moving on scrolls smoothly down to the next (click only); elements enter one by one (`.rv` + `--i` order).
Laptop: max 100vh, content in the left 60%, decoration on the right; short screens switch the intro to two text columns.
Mobile: one column, min 100vh, scrolls if needed. Decoration = one gradient half off-screen + one asset per screen
(positions in `src/styles.css` under "Decoration layer"). Assets live in `public/assets/`.

## Env vars
- `ELEVENLABS_API_KEY` (needs Text to Speech + Speech to Text access)
- `ANTHROPIC_API_KEY`
- optional: `ANTHROPIC_MODEL`, `ELEVENLABS_TTS_MODEL`, `ELEVENLABS_STT_MODEL`

## Saved versions (branches)
- `with-recap-and-audio`: the result screen with 'Download or print recap' and 'Download audio'.
- `no-download-version`: an earlier version (before the timed call, city field and other fixes).

## Voice clone
`/api/clone` makes a temporary clone named `itsaimatch-<time>`; `/api/forget` deletes it when the call ends,
on hang-up, on errors and when the page closes. Each new clone also deletes any of ours older than 30 minutes,
so nothing lingers in your ElevenLabs account (Starter allows 10 custom voices).
