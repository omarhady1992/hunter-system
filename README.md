# Hunter System

A mobile-first, installable (PWA) levelling game for Omar's calisthenics and diet journey: daily quests, XP, levels, stats, ranks E to S, titles, Boss fights (4-weekly benchmark tests), dungeons (deload weeks), the Field Camp gate and a Penalty Zone.

- Static site, no build: `index.html`, `engine.js` (pure XP/level/rank logic), `app.js` (UI), `style.css`, `sw.js`, `manifest.webmanifest`.
- **No personal data lives in this repo.** The app reads `data.json` from the private `fitness-data` repo through the GitHub API, using the key the Calisthenics Tracker already stored in this browser (same origin `omarhady1992.github.io`), or a key pasted on first launch. All XP is recomputed from that log every time the app opens, so anything logged with `data.py` shows up automatically.
- Manual quest ticks (water, posture, midday fix, 100 g by mid-afternoon), stat points, Boss results, skill unlocks and Penalty Quest progress are stored in the browser's localStorage. Codex has backup/restore.
- Inspired-by styling only; not affiliated with any anime, studio or publisher.
