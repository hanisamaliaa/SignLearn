# SignLearn

SignLearn is a capstone learning platform for structured, inclusive Indonesian Sign Language (BISINDO) education. The repository contains a React frontend and an existing Node.js backend.

## Repository structure

```text
CapstoneProject/
├── frontend/          # React, Vite, and Tailwind CSS application
│   ├── public/        # Static browser assets
│   ├── scripts/       # Frontend maintenance scripts
│   └── src/           # Components, pages, routes, services, and app state
├── backend/           # Existing Node.js API
├── .figma/            # Figma Make project tooling
└── README.md
```

## Application architecture

The frontend uses React 19, React Router, Tailwind CSS 4, and Vite 8. Its source is organized by responsibility:

- `components/` contains reusable UI and layout components.
- `pages/` contains complete user and administrator screens.
- `routes/` defines navigation and role-protected routes.
- `context/` manages authentication, theme, settings, and learning state.
- `services/` and `utils/` isolate data access and shared application logic.
- `data/` contains mock content used when API mock mode is enabled.

User profiles, learning progress, quiz results, and settings are isolated by user ID. The local-storage repository seeds demo accounts without replacing registered users, persists user-specific state across refreshes, and clears only the active session during logout. This abstraction is intended to allow the frontend to transition to the backend API without coupling UI components to storage.

The application has two authorization roles: learner and administrator. Registration creates learner accounts only, while protected routes prevent either role from accessing the other role's portal. Lessons are sequential: the next lesson remains locked until the current lesson and its quiz are completed with a minimum score of 70.

## Prerequisites

- Node.js 24 (managed by `.mise.toml` when using mise)
- npm

## Frontend setup

From the repository root:

```bash
cd frontend
npm install
```

Copy the example environment file if custom API settings are needed:

```bash
cp .env.example .env.local
```

## Frontend development

```bash
cd frontend
npm run dev
```

The Vite server listens on `PORT` when set and otherwise uses port `5173`.

## Frontend build

```bash
cd frontend
npm run build
```

The production output is written to `frontend/dist/`.

## Backend

The existing Express API skeleton, planned endpoints, environment setup, and implementation status are documented in [`backend/README.md`](backend/README.md).
