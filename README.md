# ProcrastiNO

A beautiful, aesthetic productivity tracker for pairs.

## Tech Stack
- **Framework:** Expo (React Native)
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Backend:** Supabase (Auth, Realtime DB)
- **UI:** Custom design tokens with a soft, aesthetic theme

## Features
- **Shared Accountability:** Swipe between your tasks and your partner's tasks.
- **Real-time Sync:** See each other's progress instantly.
- **Discover:** Curated podcasts and TED talks for productivity and wellness.
- **Streaks:** Keep the flame alive by completing all tasks daily.
- **Wellness Reminders:** Configurable water and posture notifications.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env
   ```

3. **Database Setup:**
   Run the SQL migrations found in `productivity_app_implementation_plan.md` in your Supabase SQL Editor.

4. **Run the app:**
   ```bash
   npx expo start
   ```

## Note for MVP
After both users sign up, manually insert a row into the `pairs` table with their UUIDs to link them.
