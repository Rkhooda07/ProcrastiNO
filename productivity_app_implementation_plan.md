# Productivity Tracker App — MVP Implementation Plan

> **For:** AI Agent  
> **Stack:** Expo (React Native) + Supabase  
> **Users:** 2 (a fixed pair — no invite system needed for MVP)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51+ with React Native |
| Language | TypeScript |
| Navigation | Expo Router (file-based routing) |
| Backend / DB | Supabase (auth, realtime DB, push tokens) |
| Notifications | expo-notifications (local, no server needed) |
| Global state | Zustand |
| Styling | StyleSheet API + custom design tokens |
| Icons | @expo/vector-icons (Ionicons) |
| In-app links | expo-web-browser |
| Haptics | expo-haptics |

---

## Screen Architecture

```
App
├── Auth (outside tab navigator)
│   ├── /login
│   └── /signup
└── Main (bottom tab navigator — 3 tabs)
    ├── Tab 1: Today's Tasks       (/tasks)
    ├── Tab 2: Discover / Podcasts (/discover)
    └── Tab 3: Profile & Streaks   (/profile)
        └── Nested: Reminder Settings (/profile/reminders)
```

> **Navigation:** Bottom tab bar with 3 tabs. Auth screens sit outside the tab navigator and redirect to `/tasks` after login.

---

## Folder Structure

```
/app
  _layout.tsx          ← root layout, session check
  (auth)/
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx         ← bottom tab navigator
    tasks.tsx
    discover.tsx
    profile.tsx
    profile/
      reminders.tsx

/components
  TaskItem.tsx
  TaskSection.tsx
  PodcastCard.tsx
  StreakBadge.tsx
  DaySummaryCard.tsx
  ReminderToggleRow.tsx

/lib
  supabase.ts           ← supabase client init

/store
  authStore.ts          ← current user, pair info
  taskStore.ts          ← tasks state + realtime sub
  reminderStore.ts      ← reminder settings

/constants
  colors.ts             ← design tokens
  podcasts.ts           ← hardcoded podcast/TED data (MVP)
```

---

## Supabase Database Schema

Run these SQL migrations in the Supabase SQL editor.

### `pairs` table
```sql
create table pairs (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid references auth.users not null,
  user_b     uuid references auth.users not null,
  created_at timestamp default now()
);
```

### `tasks` table
```sql
create table tasks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users not null,
  title      text not null,
  date       date not null,           -- which day this task belongs to
  is_done    boolean default false,
  done_at    timestamp,
  created_at timestamp default now()
);

-- Row Level Security: users can only update their own tasks
alter table tasks enable row level security;

create policy "Users can read tasks in their pair"
  on tasks for select
  using (
    owner_id = auth.uid()
    or owner_id in (
      select case when user_a = auth.uid() then user_b else user_a end
      from pairs
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "Users can only update their own tasks"
  on tasks for update
  using (owner_id = auth.uid());
```

### `reminder_settings` table
```sql
create table reminder_settings (
  user_id              uuid primary key references auth.users,
  water_interval_min   int default 45,
  posture_interval_min int default 60,
  water_enabled        boolean default true,
  posture_enabled      boolean default true
);

alter table reminder_settings enable row level security;

create policy "Users manage own reminder settings"
  on reminder_settings for all
  using (user_id = auth.uid());
```

### `user_stats` table
```sql
create table user_stats (
  user_id             uuid primary key references auth.users,
  streak_count        int default 0,
  last_completed_date date
);

alter table user_stats enable row level security;

create policy "Users read their own and paired user stats"
  on user_stats for select
  using (
    user_id = auth.uid()
    or user_id in (
      select case when user_a = auth.uid() then user_b else user_a end
      from pairs
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "Users update own stats"
  on user_stats for update
  using (user_id = auth.uid());
```

> **Pairing note (MVP):** After both users sign up, manually insert a row into `pairs` with their two user UUIDs. No invite UI needed for MVP.

---

## Feature 1 — Daily Task Checklist

### Behaviour
- Screen shows two sections: **"My Tasks"** and **"[Friend's Name]'s Tasks"**
- Both users see each other's tasks in real time
- A user can **only check off their own tasks** — friend's checkboxes are visible but disabled and muted
- Tasks are scoped by `date` column (today's date)

### Realtime subscription
```ts
// taskStore.ts
const channel = supabase
  .channel('tasks-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `date=eq.${today}`
  }, (payload) => {
    // update local state
  })
  .subscribe();
```

### Permission-gated checkbox
```tsx
// TaskItem.tsx
<Pressable
  onPress={() => markDone(task.id)}
  disabled={task.owner_id !== currentUser.id}   // ← key rule
>
  <CheckIcon filled={task.is_done} muted={task.owner_id !== currentUser.id} />
</Pressable>
```

### Daily task seeding (MVP approach)
- On app launch, check if tasks exist for `today` in DB for the current user
- If not, insert a fixed set of default tasks (defined in a `constants/defaultTasks.ts` array)
- This avoids building a full task-creation UI for MVP

```ts
// constants/defaultTasks.ts
export const DEFAULT_TASKS = [
  "Morning workout",
  "Read for 20 minutes",
  "No social media before 10am",
  "Journaling",
  "8 glasses of water",
];
```

---

## Feature 2 — Discover / Podcast Scroll

### Behaviour
- Horizontal scroll strip at top for **featured** items
- Vertical `FlatList` below for all content
- Tapping a card opens the link using `expo-web-browser`
- Bookmark icon on each card (state stored locally via Zustand for MVP)

### Data source (MVP)
Hardcode entries in `/constants/podcasts.ts`:
```ts
export const PODCASTS = [
  {
    id: '1',
    title: 'The Power of Vulnerability',
    source: 'TED Talk',
    duration: '20 min',
    url: 'https://www.ted.com/talks/brene_brown_the_power_of_vulnerability',
    thumbnail: 'https://...',
    tags: ['mindset', 'wellbeing'],
  },
  // add 10–15 entries
];
```

### Opening links
```ts
import * as WebBrowser from 'expo-web-browser';

await WebBrowser.openBrowserAsync(podcast.url);
```

---

## Feature 3 — Profile & Streak System

### Streak logic
Run this check when the app opens each morning (compare `last_completed_date` to yesterday):

```ts
async function updateStreak(userId: string) {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const yesterday = formatDate(subDays(new Date(), 1));
  const allDoneYesterday = await checkAllTasksDone(userId, yesterday);

  if (allDoneYesterday && stats.last_completed_date !== yesterday) {
    await supabase.from('user_stats').update({
      streak_count: stats.streak_count + 1,
      last_completed_date: yesterday,
    }).eq('user_id', userId);
  } else if (!allDoneYesterday && stats.last_completed_date !== yesterday) {
    // missed a day — reset streak
    await supabase.from('user_stats').update({
      streak_count: 0,
    }).eq('user_id', userId);
  }
}
```

### Profile screen layout
```
┌─────────────────────────────────┐
│  [Avatar]  Your Name            │
│  🔥 12-day streak               │
│                                 │
│  Today: 4/6 tasks done ████░░   │
│                                 │
│  ── Past Days ──                │
│  May 23  ✓ 6/6                  │
│  May 22  ✓ 5/6                  │
│  May 21  ✗ missed               │
│                                 │
│  ── [Friend's Name] ──          │
│  🔥 8-day streak  3/6 today     │
└─────────────────────────────────┘
```

---

## Feature 4 — Water & Posture Reminders

### Notification scheduling (local, no server required)
```ts
import * as Notifications from 'expo-notifications';

async function scheduleReminders(settings: ReminderSettings) {
  // Cancel all existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (settings.water_enabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💧 Water time!",
        body: "Stay hydrated — drink a glass of water",
      },
      trigger: {
        seconds: settings.water_interval_min * 60,
        repeats: true,
      },
    });
  }

  if (settings.posture_enabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧘 Posture check",
        body: "Sit up straight and take a deep breath",
      },
      trigger: {
        seconds: settings.posture_interval_min * 60,
        repeats: true,
      },
    });
  }
}
```

### Request permissions on first launch
```ts
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
  // show a message explaining why notifications matter
}
```

### Reminder settings screen UI
- Two rows, each with: label, toggle (on/off), slider (interval in minutes)
- Water: default 45 min, range 15–120 min
- Posture: default 60 min, range 15–120 min
- On save: write to `reminder_settings` in Supabase + call `scheduleReminders()`
- On app launch: read settings from Supabase + call `scheduleReminders()`

---

## UI Design System

### Color tokens (`/constants/colors.ts`)
```ts
export const colors = {
  background:    '#FAFAF8',   // warm off-white page bg
  surface:       '#FFFFFF',   // card surfaces
  accent:        '#A89AE6',   // soft lavender — primary accent
  accentMint:    '#5DCAA5',   // mint green — done/success state
  textPrimary:   '#2C2C2A',
  textSecondary: '#888780',
  textMuted:     '#B4B2A9',
  border:        '#E8E6E0',
  streakOrange:  '#EF9F27',
};
```

### Typography
- Font: system default (SF Pro on iOS, Roboto on Android)
- Heading: 20px weight 600
- Body: 15px weight 400
- Caption: 12px weight 400, textSecondary

### Spacing & shape
- Card border radius: 16px
- Chip/badge border radius: 12px
- Card shadow: `elevation: 2`, very soft
- Standard padding: 16px horizontal, 12px vertical

### Task checkbox design
- Unchecked: hollow circle, border color `#B4B2A9`
- Checked: filled circle in `accentMint` with white checkmark
- Friend's task (disabled): same visual but 40% opacity, no press feedback

### Tone & aesthetic
> Light, airy, soft pastels. No dark backgrounds. Think pastel journaling app meets wellness tracker — Notion meets a calm productivity journal. All text on white/cream surfaces. Minimal visual noise.

---

## Build Sequence (follow this order)

### Step 1 — Project scaffold
```bash
npx create-expo-app productivity-tracker --template expo-template-blank-typescript
cd productivity-tracker
npx expo install expo-router expo-notifications expo-web-browser expo-haptics
npm install @supabase/supabase-js zustand @expo/vector-icons
```

Set up folder structure as defined above.

### Step 2 — Supabase setup
- Create a new Supabase project
- Run all SQL migrations from the schema section above
- Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` into `.env`
- Init client in `/lib/supabase.ts`
- **Manually insert** a row into `pairs` after both users sign up

### Step 3 — Auth screens
- Login screen: email + password form using `supabase.auth.signInWithPassword()`
- Signup screen: email + password using `supabase.auth.signUp()`
- On session detected, redirect to `/(tabs)/tasks`
- Persist session using `AsyncStorage`

### Step 4 — Tab navigator shell
- Set up bottom tab navigator with 3 tabs: Tasks, Discover, Profile
- Use Ionicons for tab icons
- Apply accent color for active tab

### Step 5 — Tasks screen
- Fetch current user's tasks for today
- Fetch paired friend's ID via `pairs` table
- Fetch friend's tasks for today
- Subscribe to realtime changes on both
- Render two sections with permission-gated checkboxes
- On check: update `is_done` and `done_at` in Supabase + trigger haptic feedback

### Step 6 — Profile + streak screen
- On mount: run `updateStreak()` logic
- Fetch own `user_stats` and friend's `user_stats`
- Render streak count, today's progress bar, past-day summary list
- Render friend's compact stats card below

### Step 7 — Reminder notifications
- On first app launch: call `Notifications.requestPermissionsAsync()`
- Fetch `reminder_settings` from Supabase (or insert defaults if none exist)
- Call `scheduleReminders()` on every app launch
- Build settings screen with toggle + slider for each reminder type
- On settings save: update Supabase + reschedule notifications

### Step 8 — Discover screen
- Load hardcoded podcast list from `/constants/podcasts.ts`
- Build horizontal featured strip (first 3–4 items)
- Build vertical `FlatList` for all items
- Each card: thumbnail, title, source badge, duration, bookmark icon
- On tap: open URL with `WebBrowser.openBrowserAsync()`

### Step 9 — Polish pass
- Add loading skeleton screens for Tasks and Profile
- Add empty states (e.g. "No tasks yet today")
- Add error boundaries and toast messages for network failures
- Add haptic feedback on task completion (`expo-haptics`)
- Smooth checkbox animation on toggle (Animated API or Reanimated)
- Ensure all screens handle the case where `pairs` row doesn't exist yet

---

## MVP Scope Boundaries

### ✅ In scope
- Fixed pair of exactly 2 users (manual DB insert)
- Daily task checklist with realtime sync
- Permission-gated checkboxes (own tasks only)
- Streak counter + daily summary on profile
- Water + posture local notifications with configurable intervals
- Podcast/TED feed (hardcoded, opens in-app browser)
- Friend's task list visible (read-only)
- Friend's streak visible on profile

### ❌ Defer to post-MVP
- Invite/pairing system with UI
- User-created custom tasks (task CRUD)
- Server-side push notifications
- In-app podcast/audio playback
- Custom themes or dark mode
- Groups beyond 2 users
- Social features (comments, reactions)

---

## Dependencies Summary

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "^3.0.0",
    "expo-notifications": "^0.28.0",
    "expo-web-browser": "^13.0.0",
    "expo-haptics": "^13.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "zustand": "^4.0.0",
    "@expo/vector-icons": "^14.0.0",
    "react-native-async-storage": "^1.23.0"
  }
}
```
