# 🌿 ProcrastiNO

**A beautiful, aesthetic productivity tracker built for pairs.**  
*Stay accountable, stay hydrated, and grow together.*

<div align="center">
  <img src="./assets/Logo.png" width="120" height="120" alt="ProcrastiNO Logo" />
  <p align="center">
    <a href="#key-features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## ✨ Overview

**ProcrastiNO** isn't just another task manager. It's a shared wellness space designed for you and a partner (friend, partner, or colleague). With a soft, "digital journal" aesthetic, it helps you track daily habits, manage shared accountability, and maintain a healthy lifestyle through smart reminders and curated content.

## 🚀 Key Features

### 👯 Shared Accountability
- **Real-time Sync:** Swipe between your tasks and your partner's tasks. See their progress as it happens.
- **Permission-Gated:** You can only check off your own tasks, but you can always cheer your partner on.

### 📅 Daily Wellness
- **Smart Tasks:** Start every day with a fresh set of wellness-focused tasks.
- **Journaling:** A private space to reflect on your day and track your mental well-being.
- **Workouts:** Track your physical activity and keep each other motivated.

### 🔔 Intelligent Reminders
- **Water & Posture:** Configurable local notifications to keep you hydrated and sitting tall.
- **Custom Intervals:** Adjust reminders to fit your personal workflow.

### 🧭 Discover & Grow
- **Curated Feed:** Access a hand-picked selection of podcasts and TED talks focused on productivity, mindset, and wellness.
- **In-App Browsing:** Seamlessly watch or listen without leaving the app.

### 🔥 Streaks & Stats
- **Keep the Flame Alive:** Track your daily consistency with a beautiful streak system.
- **Progress Visualization:** See your week at a glance with progress bars and daily summaries.

---

## 🛠 Tech Stack

- **Framework:** [Expo](https://expo.dev/) (React Native)
- **Language:** TypeScript
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
- **Database & Auth:** [Supabase](https://supabase.com/) (Realtime, Auth, Storage)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **UI & Icons:** Lucide-react-native & Ionicons
- **Animations:** Expo Haptics & Reanimated
- **Notifications:** Expo Notifications (Local)

---

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td width="33%"><img src="https://via.placeholder.com/300x600?text=Tasks+Screen" alt="Tasks" /></td>
      <td width="33%"><img src="https://via.placeholder.com/300x600?text=Journal+Screen" alt="Journal" /></td>
      <td width="33%"><img src="https://via.placeholder.com/300x600?text=Profile+Screen" alt="Profile" /></td>
    </tr>
    <tr>
      <td align="center"><b>Shared Tasks</b></td>
      <td align="center"><b>Daily Journal</b></td>
      <td align="center"><b>Stats & Streaks</b></td>
    </tr>
  </table>
</div>

---

## 🏃 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo Go app on your mobile device (or an emulator)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/procrastino.git
   cd procrastino
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   Apply the SQL migrations found in `supabase/` (or the implementation plan) to your Supabase project's SQL editor.

5. **Start the App:**
   ```bash
   npx expo start
   ```
   Scan the QR code with Expo Go to run on your device!

---

## 📂 Architecture

```text
/app             # Expo Router pages & tab layouts
/components      # Reusable UI components (TaskItem, CameraModal, etc.)
/constants       # Design tokens, colors, and static data
/lib             # Shared libraries (Supabase client, notifications)
/store           # Global state management with Zustand
/assets          # Images, fonts, and brand assets
/supabase        # SQL migrations and backend logic
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with 🤍 by the ProcrastiNO Team
</p>
