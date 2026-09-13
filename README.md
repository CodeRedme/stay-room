# 📚 STAY ROOM

**Study · Focus · Grow**
*Study loud. Study quiet. Just study.*

STAY Room is a distraction-free study PWA — a web app you can install like a real app. Set a subject, set a timer, and the screen strips down to almost nothing so there's nothing left to do but study.

This is an independent, fan-made project inspired by the global STAY community. It is **not affiliated with, endorsed by, or officially connected to Stray Kids, JYP Entertainment**, or any related official organization.

---

## ✨ What's in v1.0.0

- **🏠 Home** — live clock, a greeting that changes with the time of day, today's stats, an exam countdown tag, and a quick task list
- **🔒 Focus Room** — pick a subject, an optional topic/goal, a duration, and a study-audio vibe (silent / loud study / your own music), then drop into **Deep Focus**: subject, timer, and a progress bar, nothing else. The timer runs on real timestamps, so it stays accurate even if you switch tabs
- **📚 Subjects** — add whatever you're studying, in your own words — no hardcoded subject list, no assumed exam board
- **⚙️ Settings** — toggle **⭐ STAY Mode** vs **🌎 Universal Mode**, switch light/dark, set your name, export a backup of your data, or clear it entirely
- **Installable PWA** — has its own icon, manifest, and a self-updating service worker
- **Local-first & private** — everything (tasks, subjects, sessions) is stored on your device via `localStorage`. Nothing is uploaded anywhere.

## 📁 Files

```
index.html          the app
style.css            night-study design system
app.js                all app logic + state
manifest.json         PWA config
sw.js                  service worker (offline + caching)
icon-192.png           app icon (small)
icon-512.png           app icon (large)
stay-room-bg.jpg       hero background art
stay-room-logo.png     full logo
stay-room-icons.png    chibi mascot lineup
```

All files are flat (no subfolders) so they can be uploaded directly through GitHub's web upload UI.

## 🚀 Deploying

1. Upload every file in this folder to your GitHub repo, flat (no folders).
2. Connect the repo to Vercel (or redeploy your existing project if reusing one).
3. Done — it's live, and installable from the browser's "Add to Home Screen" / install prompt.

## 🔄 Version

**v1.0.0** — foundation release: Home, Focus Room + Deep Focus, Subjects, Settings, STAY/Universal Mode, PWA install, local-first data.

Planned next: calendar + exam countdown, notes, flashcards, themes, achievements.

---

Made with 🌷 by Tulika · a [@minberrydiary](#) project
