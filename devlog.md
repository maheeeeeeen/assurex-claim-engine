# AssureX Claim Engine — Development Log

## Day 1 — 2026-09-26

### Session 1: Project Setup (Phase 0)
- **What was built:** Full project scaffold — backend (FastAPI + SQLModel + SQLite), frontend (React + Vite + Bootstrap + React Router), directory structure, config files, warranty policies, CI templates
- **Problems hit:** None — clean setup
- **Model failures:** N/A
- **Changes made:** Initial scaffold from build plan
- **Tests run:** `/health` endpoint verified, frontend dev server boots

### Session 2: Dataset Generation & Claim Summary Card Generator (Phase 1)
- **What was built:**
  - `backend/dataset_generator/generate_claims.py`: 2,500 synthetic warranty claim records across Electronics, Appliances, and Automotive categories.
  - Injected realistic messiness: 77 serial number mismatches, 82 date contradictions, 399 policy exclusions, 221 missing receipts, 306 unauthorized repairs, 45 duplicate claims.
  - Stratified 70/15/15 split: 1,750 train, 375 validation, 375 test. Saved as `claims_train.csv`, `claims_val.csv`, `claims_test.csv`, and `claims_full.csv`.
  - Dataset metadata summary: `backend/data/dataset_summary.json`.
  - `backend/dataset_generator/generate_cards.py`: Multiprocess Claim Summary Card generator rendering high-resolution PNG dossiers using Pillow.
  - Generated 4,250 Claim Summary Cards (Train: 3,500 across 2 visual variants; Val: 375; Test: 375).
  - Ensured strict compliance with SRS rule: cards contain zero model predictions or confidence scores.
  - Card-to-claim mapping registry: `backend/data/card_image_mapping.csv`.
  - Representative sample cards placed in `sample_claims/demo_cards/`.
- **Problems hit:** Pillow rendering 4,250 cards synchronously on single thread took ~170s; solved by parallelizing with `ProcessPoolExecutor` across CPU cores (completed in ~40s).
- **Model failures:** N/A (data generation phase).
- **Changes made:** Dataset generator scripts, CSV splits, card generator, and demo cards.
- **Tests run:** Verified shape, column completeness, stratification balance, date ranges, and Pillow image format/dimensions (640x880 RGB).

---

*Entries will be added after every development session.*
