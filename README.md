# StudySense — Topic-Wise Diagnostic Learning System

A responsive web app prototype in plain HTML, CSS and JavaScript. No install, build step, API key or server: open `index.html` in a modern browser.

## Look and feel
Matches the supplied dashboard mockup: navy sidebar, teal/blue accents, soft 3D depth. Cards tilt toward the cursor with a glare highlight, buttons press down, the hero scene and gems float, and the donuts animate in. All illustrations (hero scene, chip, trophy, target, plants, notebook) are inline SVG/CSS. `prefers-reduced-motion` turns off tilt, floating, animations and confetti. A light/dark toggle is in Settings.

## Screens
- **Home** — time-of-day greeting, four stat cards, subject cards with Strong/Moderate/Needs Review chips, and a "Next up" banner.
- **Take Assessment** — pick subject, topic and question count. The quiz shows a time-spent timer, "n / total" progress, an illustrated question card and A–D options. Keyboard: A–D or 1–4 to answer, Enter/→ next, ← back.
- **Results** — score donut, feedback card, topic-wise performance rows, and *View Detailed Analysis* for per-question explanations. Retest the weakest topic in one click.
- **My Subjects** — every topic with its latest status.
- **Revision Plan** — numbered priority cards (High ≤ 50%, Medium 51–69%, Low 70–79%) with a tip from each topic's `revision` text and a *Revise Now* button. Notes, Practice and Videos tabs sit below.
- **Progress** — "Topic Performance Over Time" line chart with a dashed **Target (80%)** line, recent attempts with change vs. the previous attempt, topic status, and an encouragement banner.
- **Search** — the magnifier in the top bar (or press `/`) searches subjects, topics and question text. Picking a subject, topic or question opens Take Assessment with that subject/topic preselected. Esc closes it.
- **Login** — a login / sign-up screen appears on first visit, with *Continue as guest*. Click the avatar for the account menu (Settings, Log out / Log in). Each account keeps its own progress, name and theme.
- **Videos tab** (Revision Plan) — shows "Not available".
- **Settings** — display name, account status with log in / log out, light/dark theme, question-quality controls (below), reset progress.

## Question quality & quiz modes (v3)
- **Review workflow:** each question has a `reviewed` flag (set `"reviewed": true` in the bank) and you can also mark questions reviewed inside the app. Turn on **Reviewer mode** in Settings to get *Mark as reviewed* buttons on the question screen and in the detailed analysis. **Only use reviewed questions** restricts assessments to reviewed items. *Copy reviewed question IDs* copies the list so you can write it back into the JSON. Reviewed marks are saved per account.
- **Option shuffling:** option order is randomised every attempt and the answer key is remapped. Questions whose options depend on position ("Both A and R…", "All of the above") are left in order.
- **Adaptive mode:** pick *Adaptive* in the setup. It starts at medium; a correct answer moves to a harder question, a wrong one to an easier one, spreading questions across topics. No going back in adaptive mode. (The bank currently has only easy and medium items, so "hard" falls back to medium until hard questions are added.)
- **New question types**, supported by the app and seeded with 12 sample questions in `question_bank_extra.js`: *multi-select* (`"type":"multi"`, `answer` is an array, all correct options required), *assertion–reason* (`"type":"assertion"`, the four standard options, newline-separated text), and *numericals with worked steps* (`"steps": [...]` is shown in Detailed Analysis).

## Content
Mapped to the PCCOE First Year B.Tech Computer Engineering syllabus (Regulations 2026, AY 2026-27): 14 subjects across Semester I and II, 56 topics (one per syllabus unit or theme) and 1,120 MCQs (20 per topic).

- **Semester I:** Linear Algebra & Univariate Calculus, Engineering Physics, Computational Thinking & Problem Solving, Digital Electronics & Computer Organization, Constitution of India, Communicative English, Life Skills 1.
- **Semester II:** Multivariate Calculus, Engineering Chemistry, Object Oriented Programming, Discrete Mathematics, Universal Human Values, Indian Knowledge System, Life Skills 2.

Every question is marked `draft-review-needed` in the bank (use the review workflow above to track what you've checked). Check them against your own notes and the official syllabus before relying on them.

## Project structure
- `index.html` — structure and screens
- `styles.css` — theme, 3D effects, dark mode, responsive rules
- `app.js` — assessment logic, diagnosis, rendering and persistence
- `question_bank.js` — the question bank the app actually loads (generated)
- `question_bank_extra.js` — hand-written supplementary questions (multi-select, assertion–reason, worked numericals); edit directly
- `studysense_theory_20_per_unit.json` — source copy of the same bank for editing and review

### Editing the question bank
The app reads `question_bank.js`, not the JSON or CSV. It is a plain script so the app works when opened straight from disk (a `fetch()` of a local JSON file is blocked by browsers). After editing the JSON, regenerate it:

```
python3 - <<'PY'
import json
j = json.load(open("studysense_theory_20_per_unit.json", encoding="utf-8"))
keys = ("id","subject","topic","type","text","options","answer","explanation","difficulty","unit")
out = {"syllabus": j["syllabus"], "subjects": j["subjects"], "questions": [{k: q[k] for k in keys} for q in j["questions"]]}
open("question_bank.js", "w", encoding="utf-8").write("const QUESTION_BANK = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
PY
```

## Data & rules
- Guest progress is saved in `localStorage` under `studysense-progress-v2`; each account uses `studysense-progress-v2:u:<username>`. Accounts are in `studysense-accounts-v1` and the active session in `studysense-session-v1`. The key was bumped with the syllabus-mapped bank because topic IDs changed; progress from the earlier 33-question sample (`v1`) is not carried over.
- Status bands: Strong ≥ 80%, Moderate 50–79%, Needs review < 50%. "Weak Topics" on Home counts every assessed topic below 80%, matching the Revision Plan.
- Charts and donuts are drawn with inline SVG.

## Limitations
- The bank is original practice content, still marked draft-review-needed. Verify it against the official syllabus before relying on it for exam preparation.
- Each topic now has 20 questions (mostly easy/medium recall, plus numerical and application items). A full-topic attempt is a stronger signal than before, but a 10-question quick check is still only an estimate.
- The mockup's "Class Average" line is not drawn because there is no real class data. A labelled Target (80%) line is shown instead.
- Notifications in the top bar is a placeholder. Videos are marked "Not available".
- Login is local to this browser: there is no server, so accounts can't sync across devices and a forgotten password can't be recovered (clear site data to start over). Passwords are salted and hashed (PBKDF2 where the browser allows it), never stored in plain text, but this is not a substitute for real server-side authentication.
- Progress lives only in this browser; there is no cloud sync.
- Google Fonts load when online; the app falls back to system fonts offline.
