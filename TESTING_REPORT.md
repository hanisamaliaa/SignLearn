# SignLearn Kids — Verification Report

Date: 2026-08-17

This report records tests that were actually run. Cases outside the current
feature scope remain marked blocked/not run and are never counted as passed.

## Automated verification

| Check | Result |
|---|---|
| Backend unit/contract tests | 50/50 passed |
| Frontend behavior tests | 87/87 passed |
| Camera/AI service tests | 13/13 passed |
| Live PostgreSQL + HTTP smoke test | Word bank 11/11; password-reset DB 12/12 and HTTP 6/6; temporary rows deleted |
| SMTP transport verification | Gmail STARTTLS transport authenticated and ready; secrets not logged |
| Frontend lint | 0 errors and 0 warnings |
| Vite production build | Passed; 614 modules transformed |
| BISINDO assets in production output | Exactly A–Z (26 lossless 1024×1024 WebP files); audit sheet excluded |
| Dependency audit | 0 known vulnerabilities in root, backend, and frontend |
| Approved-canvas reproduction | Passed via `npm run assets:bisindo`; source hash locked |
| Production preview smoke | `/forgot-password` and `/reset-password` return HTTP 200; previous public/user route smoke remains passed |

## Black-box cases

| ID | Module | Scenario | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| CFG-001 | Backend | Start with legacy Mongo-only `.env` | Refuse unsafe/mismatched config | Startup identifies missing `DATABASE_URL` and short JWT secret | Pass | Prevents a false healthy auth server |
| AUTH-001 | Database | Connect to PostgreSQL | Connection succeeds before HTTP listens | Health endpoint reports `database: connected` | Pass | Verified through the live server |
| AUTH-002 | Auth | Register valid user | Hashed user row and session created | Not executed without database | Blocked | Repository/service path inspected |
| AUTH-003 | Auth | Duplicate registration | 409 without duplicate row | Not executed without database | Blocked | Unique lower-email index exists |
| AUTH-004 | Auth | Wrong password | Generic 401 | Not executed without database | Blocked | Timing-safe dummy bcrypt path inspected |
| AUTH-005 | Auth | Session refresh | HttpOnly cookie rotates and restores user | Not executed without database | Blocked | Single-flight frontend refresh present |
| AUTH-006 | Auth | Admin authorization | Non-admin receives 403 | Not executed without database | Blocked | RBAC middleware covers mutations |
| AUTH-007 | Password reset | Request code while SMTP is configured | Code is delivered by email and never exposed in the API/UI | SMTP ready; HTTP envelope contains `data: null` and no `devCode` | Pass | Sender credentials remained masked during verification |
| AUTH-008 | Password reset | Submit valid code and a new password | Persist new hash, consume code, revoke old sessions | PostgreSQL and HTTP smoke tests pass | Pass | All three mutations are atomic |
| AUTH-009 | Password reset | Login after reset | Old password fails and new password succeeds | HTTP 401 for old and 200 for new | Pass | Temporary account deleted |
| AUTH-010 | Password reset | Submit invalid/expired code | Show an error without crashing or getting stuck | Alert type is normalized and regression-tested | Pass | Backend message is displayed to the user |
| NAV-001 | Navigation | Footer links from non-landing route | Navigate to `/` and target section | Navigation unit tests pass | Pass | Absolute landing URLs verified |
| A11Y-001 | Accessibility | Reset preferences | Normal, light, motion/subtitle/focus off | Unit test confirms sanitized defaults | Pass | Reset gives live confirmation |
| A11Y-002 | Accessibility | Dialog overlay and Escape | No reflow, trapped focus, focus restored | Portal/focus behavior code verified | Pass | Browser visual test still recommended |
| A11Y-003 | Accessibility | Reduced motion | Decorative movement removed | Global CSS plus OS media rule present | Pass | Functional state changes remain |
| TRN-001 | Word bank | Validate entry | Valid entry accepted | Backend unit test passes | Pass | Includes media URL and aliases |
| TRN-002 | Word bank | Reject invalid entry | Field errors returned | Backend unit test passes | Pass | Rejects unsafe URL and invalid status |
| TRN-003 | Word bank | Normalize query | Case/spacing/full-width normalized | Backend unit test passes | Pass | Uses NFKC and Indonesian lowercase |
| TRN-004 | Word bank | Admin creates, updates, searches, then deletes | DB-backed lifecycle works through HTTP | Live smoke test passed and removed its row | Pass | Also verifies inactive public/admin visibility |
| TRN-005 | Admin word bank | Expired/invalid optional-auth token | Return 401 so the client refresh interceptor runs | Invalid Bearer token returns 401 | Pass | Prevents inactive entries silently disappearing |
| DCT-001 | Dictionary | Open alphabet without API data | Complete A–Z remains available | 26 build-time HD assets and fallback UI verified | Pass | Word categories degrade independently |
| DCT-002 | Dictionary | Group seeded learning words | Stable category and alphabetical ordering | 33 words across 5 categories | Pass | Seed is idempotent |
| TXT-001 | Text translator | Translate `aku mau makan` | Render A-K-U, M-A-U, M-A-K-A-N with word spacing | Frontend behavior test passes | Pass | Explicit fingerspelling, not word-level grammar |
| TXT-002 | Voice input | Dictate Indonesian text | Use `id-ID`; fall back to typing when unsupported/insecure | Hook and fallback states verified | Pass | Physical microphone/browser matrix remains manual QA |
| TXT-003 | User portal | Open translator from sidebar | One protected page exposes text, speech, and camera modes | Route/menu included in production bundle and preview returns 200 | Pass | Text mode is the dashboard default |
| AST-001 | Alphabet media | Regenerate A–Z from approved canvas | Deterministic lossless 1024×1024 cards plus manifest | Source hash, pixel round-trip, dimensions, and 26-file assertion pass | Pass | User-approved imagegen canvas is the locked production source |
| AI-001 | AI | Temporal smoothing and duplicate suppression | Stable output, no spam | 13 recognition tests pass | Pass | EMA, majority vote, release lock |
| AI-002 | AI | Camera route cleanup | Tracks stop on unmount | Hook cleanup inspected | Pass | Physical camera test not available |

## UAT simulations

| ID | Actor | Goal | Actual | Status | Limitation |
|---|---|---|---|---|---|
| UAT-CHILD-01 | Child | Use camera translator and understand feedback | UI covers ready, detecting, uncertain, success, clear/copy | Pass | Physical gesture quality requires a child/device session |
| UAT-PARENT-01 | Parent | Configure accessibility and retain it | Unified persistent preferences apply across public and portal routes | Pass | Browser zoom matrix remains manual QA |
| UAT-ADMIN-01 | Admin | Manage and preview BISINDO vocabulary | CRUD/search/filter/status/preview API path works against PostgreSQL | Pass | Final cross-browser visual review remains recommended |

## SUS readiness

The UI provides consistent navigation, clear state feedback, undo-safe delete
confirmation, child-friendly error copy, keyboard-operable controls, and a
single accessibility preference model. A statistically valid SUS score cannot
be calculated because actual participant responses are not available.

## WCAG-oriented review

Reviewed keyboard focus, dialog semantics, Escape close, focus restoration,
form labels and field errors, focus visibility, text reflow, reduced motion,
caption preference, contrast tokens, and minimum control sizes. This is an
engineering review targeting WCAG 2.2 AA principles, not formal certification.
