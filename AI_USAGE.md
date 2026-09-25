# AI Tool Usage Declaration — AssureX Claim Engine

> As required by SRS §1.8, all AI tools used during development are declared below.
> Each entry documents: tool name, purpose, affected files, team modifications, and testing performed.

---

## 2026-09-26 — Google Antigravity (Gemini)
- **Purpose:** Scaffold project structure — FastAPI backend, React frontend, config files, warranty policies
- **Prompt/assistance type:** "Scaffold a FastAPI project with SQLModel/SQLite and React+Vite frontend with Bootstrap"
- **Files/modules affected:** All initial project files (main.py, App.jsx, requirements.txt, package.json, policies/*.json, config/*.json)
- **Modifications made by team:** Reviewed all generated files, verified structure matches SRS requirements, adjusted config values
- **Testing performed:** Backend `/health` endpoint returns 200, frontend dev server starts without errors
- **Verified by:** Team Lead

## 2026-09-26 — Google Antigravity (Gemini)
- **Purpose:** Synthetic claim dataset and Claim Summary Card image generation (Phase 1)
- **Prompt/assistance type:** "Generate 2,500 synthetic warranty claim records with realistic anomalies and render Claim Summary Cards without predictions using Pillow"
- **Files/modules affected:**
  - `backend/dataset_generator/generate_claims.py`
  - `backend/dataset_generator/generate_cards.py`
  - `backend/data/claims_*.csv`
  - `backend/data/dataset_summary.json`
  - `backend/data/card_image_mapping.csv`
  - `sample_claims/demo_cards/*`
- **Modifications made by team:** Verified stratified split distributions (70/15/15), tuned anomaly ratios (serial mismatches, date contradictions, excluded damages), audited card layout to guarantee strict absence of model predictions/confidence scores per SRS.
- **Testing performed:** Validated column consistency across train/val/test splits, checked Pillow rendering output, confirmed 4,250 PNG card files generated successfully with zero errors.
- **Verified by:** Team Lead

---

*Entries will be added for every AI-assisted development session.*
