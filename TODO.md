# Multi-User Authentication & Learning State Refactor

## Plan

Redesign the auth & learning state so each user has fully isolated data
(profile, learning/progress, settings). Demo accounts (Budi, Admin) are
seeded on startup and never overwritten. Registration only appends new users.
Storage is abstracted behind repository/service functions for future backend
compatibility. UI is NOT redesigned.

## Data Model

```js
{
  id, name, email, password(hashed), role, profileType,
  profile: { phone, avatar, bio },
  learning: {
    enrolledCourses: [],
    completedLessons: [],
    unlockedLessons: [],
    quizResults: [],
    progress: {}
  },
  settings: { theme, fontSize, notifications, accessibility },
  joinDate
}
```

## Steps

- [x] 1. Analyze current architecture (context, mock data, pages, providers)
- [x] 2. Create storage abstraction layer (repository + service)
- [x] 3. Add password hashing util
- [x] 4. Refactor AppContext: users[] + currentUserId, seed demo accounts,
     per-user profile/learning/settings, login/logout/register, quiz gating
- [x] 5. Reorder providers in App.jsx (BrowserRouter > AppProvider > Theme/Settings)
- [x] 6. Refactor ThemeContext & SettingsContext to read/write per-user settings
- [x] 7. Refactor user pages to use per-user courses/quizHistory/learning
     (Courses, CourseDetail, Dashboard, Lesson, Progress, Quiz, QuizResult,
     Profile, Settings, PortalHeader)
- [x] 8. Refactor services to expose repository-style API (auth, user, progress,
     course, quiz, dashboard)
- [x] 9. Verify all scenarios (Budi/Arsen isolation, register, refresh, settings)
- [x] 10. No runtime errors / no console errors / no broken routes (vite build passes)

## Architecture Verified

- ✅ Budi & Admin always login (seeded on startup, hashed in background)
- ✅ Registering appends new user, never overwrites demo accounts
- ✅ New users start at 0% (empty learning, only first lesson unlocked)
- ✅ Progress/quiz/settings are per-user (isolated by userId)
- ✅ Logout clears only auth (currentUserId), never deletes data
- ✅ Refresh persists per-user data (localStorage repository)
- ✅ Theme/fontSize/notifications/accessibility stored per user
- ✅ Provider order correct (Router > AppProvider > Theme/Settings)
- ✅ `vite build` passes with no errors
