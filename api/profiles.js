import { body, needKey, claude, parseJson } from './_lib.js'
import { matchProfilePrompt, USER_SUMMARY_PROMPT, interestFor } from './_prompts.js'

// Before the call:
//  1. invents the match by having AI answer the same five questions
//     (it only knows its gender, who it's into and the goal, never your answers);
//  2. summarises your real answers into a few bullet points.
// Both run at the same time.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!needKey(res, 'ANTHROPIC_API_KEY')) return

  try {
    const { questions = [], answers = [], userGender, matchGender, goal } = body(req)

    const makeMatch = claude({
      system: 'You write realistic dating-app profiles. Reply with JSON only.',
      messages: [
        {
          role: 'user',
          content: matchProfilePrompt({ gender: matchGender, interestedIn: interestFor(userGender), goal, questions }),
        },
      ],
      maxTokens: 900,
      temperature: 1, // a different person every time
    }).then(parseJson)

    const summariseUser = claude({
      system: USER_SUMMARY_PROMPT,
      messages: [
        { role: 'user', content: questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || ''}`).join('\n\n') },
      ],
      maxTokens: 300,
    }).then(parseJson)

    const [match, user] = await Promise.all([makeMatch, summariseUser])
    const list = (a, n) => (Array.isArray(a) ? a.map(String).filter(Boolean).slice(0, n) : [])

    res.json({
      match: { answers: list(match.answers, questions.length), summary: list(match.summary, 4) },
      user: { summary: list(user.summary, 4) },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
