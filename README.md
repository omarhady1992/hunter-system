# Hunter System

A mobile-first, installable (PWA) levelling game for Omar's calisthenics and diet journey: daily quests, XP, levels, stats, ranks E to S, titles, Boss fights (4-weekly benchmark tests), dungeons (deload weeks), the Field Camp gate and a Penalty Zone.

- Static site, no build: `index.html`, `engine.js` (pure XP/level/rank logic), `app.js` (UI), `style.css`, `sw.js`, `manifest.webmanifest`.
- **No personal data lives in this repo.** The app reads `data.json` from the private `fitness-data` repo through the GitHub API, using the key the Calisthenics Tracker already stored in this browser (same origin `omarhady1992.github.io`), or a key pasted on first launch. All XP is recomputed from that log every time the app opens, so anything logged with `data.py` shows up automatically.
- Manual quest ticks (water, posture, midday fix, 100 g by mid-afternoon), stat points, Boss results, skill unlocks and Penalty Quest progress are stored in the browser's localStorage. Codex has backup/restore.
- Inspired-by styling only; not affiliated with any anime, studio or publisher.

## Apps (Windows and Android)

Downloads are on the [Releases page](https://github.com/omarhady1992/hunter-system/releases/latest): `Hunter-System-1.0.0.apk` (Android 6+), `Hunter-System-Setup-1.0.0.exe` (Windows 10/11 x64 installer) and a portable Windows zip. Both apps bundle these web files and work offline; on first launch they ask for a read-only fine-grained GitHub token (fitness-data, Contents: Read-only), stored only on that device. No token is built into the apps.

`packaging/` holds the build configs: Capacitor 7 for Android (signed with a private release key kept outside this repo), Electron 33 plus an NSIS script for Windows.
