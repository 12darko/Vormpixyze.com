# VormPixyze.io

Real-time multiplayer **.io territory-conquest game** — *Paint. Mutate. Conquer.*
Conquer territory, **evolve** to unlock powers, and **fortify** the land you take.

## Stack
- **Backend:** ASP.NET Core 9 + SignalR (WebSocket), EF Core (SQLite / PostgreSQL)
- **Frontend:** React 19 + Vite + TypeScript, Canvas 2D rendering
- **Realtime:** server-authoritative game loop (~30 ticks/s), one engine per mode/room

## Game modes
- **Outbreak** — endless free-for-all
- **Blitz** — 5-minute ranked match (timer + winner + arena reset)

## Evolve & Fortify
Each evolution tier unlocks a real power:

| Tier | Power |
|------|-------|
| Crystal Core (Lv2) | Shields |
| Energy Entity (Lv3) | Boost |
| Void Creature (Lv4) | Structures −40% |
| Cosmic Infection (Lv5) | Mutation Pulse (AoE slow) |

## Local development
Backend (port 5289):
```bash
cd backend
dotnet run --urls http://localhost:5289
```
Frontend (port 5173):
```bash
cd frontend
npm install
npm run dev
```
The frontend reads the backend URL from `VITE_API_URL` (defaults to `http://localhost:5289`); see `frontend/.env.example`.

## Deploy
See **[DEPLOY.md](DEPLOY.md)** — Coolify (VPS) guide for **vormpixyze.com**.

## Docs
- [ANALIZ.md](ANALIZ.md) — technical analysis & roadmap
- [DESIGN-PLAN.md](DESIGN-PLAN.md) — "Living Pixel" visual identity
- [GAME-STRATEGY.md](GAME-STRATEGY.md) — product / mode / audience strategy
- [DEPLOY.md](DEPLOY.md) — deployment guide
