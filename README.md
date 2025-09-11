# PinBoard — Real-time Collaborative Kanban

Lightweight, real-time collaborative Kanban board built with React + Node and Supabase/Postgres.  
Features: boards, columns, cards, real-time sync (WebSockets), presence, notifications, audit logs.

## ✨ Key features
- Create / manage boards, columns, cards
- Drag & drop cards between columns
- Real-time updates via WebSockets (Socket.IO)
- Presence tracking (Upstash Redis)
- In-app notifications, audit logs
- Optional email notifications via SendGrid
- Single Docker image for frontend + backend (Render friendly)

## Tech stack
- Frontend: React + TypeScript (Vite)  
- Backend: Node.js + Express + TypeScript  
- Real-time: Socket.IO (WebSockets)  
- DB: Supabase (Postgres) — Sequelize models used server-side  
- Redis: Upstash (presence, ephemeral locks)  
- Email: SendGrid  
- Deployment: Docker (single Dockerfile) — Render.com

---

## Local development

Prerequisites
- Node.js v18+ / npm
- Git
- Supabase project (for Postgres)
- Upstash Redis (optional for presence)
- SendGrid API key (optional for email)

1. Clone
```bash
git clone <repo-url>
cd auction-PrimeBid-main
```
