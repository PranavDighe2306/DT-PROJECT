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

## Backup, resume, bookmarks & semester filter (v6)
- **Export / import progress** (Settings → Backup): *Export* downloads a JSON file with your history, topic results, mistake notebook, bookmarks, reviewed flags and settings. *Import* replaces the current account's progress with such a file after a confirmation; invalid files are rejected without touching anything. Use it to move between browsers or devices, or as a backup before clearing site data.
- **Auto-save & resume:** the quiz in progress is saved after every answer or navigation (and when the tab is hidden or closed). Leaving with the ← button keeps it. A *Resume* banner appears on Home and on Take Assessment, restoring the same questions, option order, answers and position. Time spent away doesn't count, so a mock-test timer is effectively paused. Finishing or discarding clears the save. One unfinished quiz is kept per account.
- **Flag for later / bookmarks:** ☆ Flag for later on any question (and in the detailed analysis). Bookmarked questions are listed in the Mistake Notebook under *Show → Bookmarked* even if you never got them wrong. Reset progress keeps your bookmarks and reviewed flags.
- **Semester filter:** All / Semester I / Semester II on Home and My Subjects (derived from each subject's description). The stat cards still count every subject.
- Storage keys added: `studysense-quiz-v1` (unfinished quiz, with `:u:<username>` for accounts).

## Mock tests & weighted diagnosis (v5)
- **Mock test mode** (Mode dropdown on the setup screen): a timed, mixed-question exam at 1 minute per question (max 90). The timer counts down and turns red in the last minute; when time runs out the test is submitted automatically. A **question navigator** lets you skip and come back, answered questions are highlighted, and the button says *Skip* on unanswered questions. Unanswered questions count as wrong, and you're warned before submitting with blanks. Explanations appear only on the results screen.
- **Weighted diagnosis:** a topic's score is no longer just the latest attempt. It blends up to your last 5 attempts on that topic, weighting newer and larger attempts more (each older attempt counts 0.6× the next newer one). The Results screen still shows that single attempt's score.
- **Confidence labels:** based on how many questions the estimate rests on: under 15 = *Low*, 15–29 = *Medium*, 30+ = *High*. Shown on My Subjects, Revision Plan, Progress and the Home recommendation. Short attempts show a note explaining that they're only an estimate.
- **Bug fix:** choosing a specific topic on the setup screen and pressing *Begin* previously reset to "All topics". It now respects your choice.

## Mistake notebook & spaced repetition (v4)
- **Mistake Notebook** (sidebar): every question you answer wrongly is saved with its correct answer, explanation and worked steps. Filter by subject, topic, or status (in notebook / due now / mastered). Click a question to reveal the answer.
- **Spaced repetition:** a missed question is due again after **1 day**, then **3 days**, then **7 days**. Answering it correctly when it's due moves it to the next interval; after the third success it counts as *mastered*. A wrong answer sends it back to the start. A correct answer *before* the due date doesn't advance it.
- **Due for review:** Home shows a banner with the count, the sidebar shows a badge, and the notebook has a *Review <subject> (n)* button that runs a session of up to 20 due questions from that subject.
- Review sessions are logged separately (`reviewLog`), so they don't change topic results, history or overall accuracy. Reset progress clears the notebook but keeps your reviewed-question flags.

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
- Progress also stores `mistakes` (the spaced-repetition schedule), `reviewLog` and `reviewed` flags alongside history and topic results.
- Guest progress is saved in `localStorage` under `studysense-progress-v2`; each account uses `studysense-progress-v2:u:<username>`. Accounts are in `studysense-accounts-v1` and the active session in `studysense-session-v1`. The key was bumped with the syllabus-mapped bank because topic IDs changed; progress from the earlier 33-question sample (`v1`) is not carried over.
- Status bands (applied to the weighted topic estimate): Strong ≥ 80%, Moderate 50–79%, Needs review < 50%. "Weak Topics" on Home counts every assessed topic below 80%, matching the Revision Plan.
- Charts and donuts are drawn with inline SVG.

## Limitations
- The bank is original practice content, still marked draft-review-needed. Verify it against the official syllabus before relying on it for exam preparation.
- Each topic now has 20 questions (mostly easy/medium recall, plus numerical and application items). A full-topic attempt is a stronger signal than before, but a 10-question quick check is still only an estimate.
- The mockup's "Class Average" line is not drawn because there is no real class data. A labelled Target (80%) line is shown instead.
- Notifications in the top bar is a placeholder. Videos are marked "Not available".
- Login is local to this browser: there is no server, so accounts can't sync across devices and a forgotten password can't be recovered (clear site data to start over). Passwords are salted and hashed (PBKDF2 where the browser allows it), never stored in plain text, but this is not a substitute for real server-side authentication.
- Progress lives only in this browser; there is no cloud sync (use Export/Import to move it).
- Google Fonts load when online; the app falls back to system fonts offline.
