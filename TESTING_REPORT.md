# SignLearn Kids — Verification Report

Date: 2026-08-13

This report records tests that were actually run. Database-dependent cases are
marked blocked when the local environment cannot supply PostgreSQL credentials;
they are not counted as passed.

## Black-box cases

| ID | Module | Scenario | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| CFG-001 | Backend | Start with legacy Mongo-only `.env` | Refuse unsafe/mismatched config | Startup identifies missing `DATABASE_URL` and short JWT secret | Pass | Prevents a false healthy auth server |
| AUTH-001 | Database | Connect to PostgreSQL | Connection succeeds before HTTP listens | No `DATABASE_URL` is available locally | Blocked | Supply a real PostgreSQL URL, then migrate |
| AUTH-002 | Auth | Register valid user | Hashed user row and session created | Not executed without database | Blocked | Repository/service path inspected |
| AUTH-003 | Auth | Duplicate registration | 409 without duplicate row | Not executed without database | Blocked | Unique lower-email index exists |
| AUTH-004 | Auth | Wrong password | Generic 401 | Not executed without database | Blocked | Timing-safe dummy bcrypt path inspected |
| AUTH-005 | Auth | Session refresh | HttpOnly cookie rotates and restores user | Not executed without database | Blocked | Single-flight frontend refresh present |
| AUTH-006 | Auth | Admin authorization | Non-admin receives 403 | Not executed without database | Blocked | RBAC middleware covers mutations |
| NAV-001 | Navigation | Footer links from non-landing route | Navigate to `/` and target section | Navigation unit tests pass | Pass | Absolute landing URLs verified |
| A11Y-001 | Accessibility | Reset preferences | Normal, light, motion/subtitle/focus off | Unit test confirms sanitized defaults | Pass | Reset gives live confirmation |
| A11Y-002 | Accessibility | Dialog overlay and Escape | No reflow, trapped focus, focus restored | Portal/focus behavior code verified | Pass | Browser visual test still recommended |
| A11Y-003 | Accessibility | Reduced motion | Decorative movement removed | Global CSS plus OS media rule present | Pass | Functional state changes remain |
| TRN-001 | Word bank | Validate entry | Valid entry accepted | Backend unit test passes | Pass | Includes media URL and aliases |
| TRN-002 | Word bank | Reject invalid entry | Field errors returned | Backend unit test passes | Pass | Rejects unsafe URL and invalid status |
| TRN-003 | Word bank | Normalize query | Case/spacing/full-width normalized | Backend unit test passes | Pass | Uses NFKC and Indonesian lowercase |
| TRN-004 | Word bank | Admin creates then public searches | DB-backed result appears without React edit | Not executed without database | Blocked | End-to-end layers implemented |
| AI-001 | AI | Temporal smoothing and duplicate suppression | Stable output, no spam | 13 recognition tests pass | Pass | EMA, majority vote, release lock |
| AI-002 | AI | Camera route cleanup | Tracks stop on unmount | Hook cleanup inspected | Pass | Physical camera test not available |

## UAT simulations

| ID | Actor | Goal | Actual | Status | Limitation |
|---|---|---|---|---|---|
| UAT-CHILD-01 | Child | Use camera translator and understand feedback | UI covers ready, detecting, uncertain, success, clear/copy | Pass | Physical gesture quality requires a child/device session |
| UAT-PARENT-01 | Parent | Configure accessibility and retain it | Unified persistent preferences apply across public and portal routes | Pass | Browser zoom matrix remains manual QA |
| UAT-ADMIN-01 | Admin | Manage and preview BISINDO vocabulary | CRUD/search/filter/page/preview UI and protected API implemented | Blocked | Real database credentials unavailable |

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
