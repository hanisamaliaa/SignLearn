# SignLearn

SignLearn is a capstone learning platform for structured, inclusive Indonesian Sign Language (BISINDO) education. The repository contains a React frontend, Node.js application backend, and a Python realtime BISINDO inference service.

## Repository structure

```text
CapstoneProject/
├── frontend/          # React, Vite, and Tailwind CSS application
│   ├── public/        # Static browser assets
│   ├── scripts/       # Frontend maintenance scripts
│   └── src/           # Components, pages, routes, services, and app state
├── backend/           # Existing Node.js API
├── ai/                # MediaPipe + Random Forest BISINDO inference API
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

## Realtime BISINDO camera recognition

The camera-to-text feature uses three independent layers:

1. `frontend/` captures compressed webcam frames adaptively and stabilizes
   predictions with EMA smoothing plus a rolling 3-of-5 majority vote.
2. `ai/` extracts MediaPipe landmarks and runs the BISINDO Random Forest model.
3. `backend/` remains responsible for accounts, courses, quizzes, and progress;
   it is intentionally not coupled to high-frequency image inference.

Siapkan virtual environment AI satu kali:

```bash
cd ai
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

Setelah itu backend, frontend, dan layanan AI dapat dijalankan bersama dari satu terminal:

```bash
npm run dev
```

Perintah tersebut menghentikan kedua proses bersama saat `Ctrl+C` ditekan.
Untuk menjalankannya secara terpisah tetap tersedia `npm run dev:frontend` dan
`npm run dev:ai`.

Open `http://localhost:4789`, choose **Kamera → Teks**, and grant camera
permission. Hold a sign briefly until it is stable. Different letters can be
signed directly; repeating the same letter needs a brief release/change signal.
Spaces are added explicitly with the **Tambah spasi** button.

Recognition tuning is available through the `VITE_BISINDO_*` values documented
in `frontend/.env.example`. The realtime pipeline applies probability smoothing,
a rolling majority window, adaptive top-1/top-2 margin filtering, fast/normal
acceptance paths, and duplicate-only release locking. Set
`VITE_BISINDO_DEBUG=true` in `frontend/.env.local` to display per-inference
telemetry and top-three predictions. Raw frame predictions never directly update
the translation result.

The model is stored in `ai/models/`. Training CSV files are intentionally not
duplicated into this application because they are not needed for inference;
the original dataset remains in the source ML project for retraining and audit.

The leakage-safe Kaggle retraining pipeline can be reproduced from the project
root with:

```bash
npm run ai:download
npm run ai:train
npm run ai:evaluate
```

Evaluation artifacts are written to `ai/reports/`. Candidate models stay under
`ai/models/candidates/`; the production model is not replaced automatically.
