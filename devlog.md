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

### Session 3: Card Quality Overhaul & Tabular ML 8-Model Benchmark (Phase 2)
- **What was built:**
  - **High-Resolution Card Engine Overhaul**:
    - Re-engineered `generate_cards.py` from 640x880 to High-DPI 1200x1680 (2x supersampling).
    - Eliminated text collisions: full-width product row, structured 2-column key-value grid, dynamic badge width calculations via `getbbox`, and generous column padding.
    - Corrected warranty grace period logic (`-7 <= days < 0`).
    - Re-rendered all 4,250 Claim Summary Cards across train, validation, and test splits with razor-sharp typography.
  - **Tabular ML Preprocessing Pipeline (`backend/src/ml/preprocessing.py`)**:
    - Full ColumnTransformer with StandardScaler, OneHotEncoder, and boolean passthrough (88 engineered features).
  - **8-Model Classifier Benchmark (`backend/src/ml/train_models.py`)**:
    - Trained & evaluated: Logistic Regression, Decision Tree, Random Forest, XGBoost, LightGBM, SVM, KNN, Gaussian Naive Bayes.
    - 5-fold Stratified Cross-Validation on training set per SRS Deliverable 4.
    - Generated 8 confusion matrix heatmaps (`reports/confusion_matrices/`).
    - Exported feature importance chart (`reports/feature_importance.png`) and comparison bar chart (`reports/model_comparison_chart.png`).
    - Selected winner: **XGBoost** (Validation Weighted F1: 1.0000, 5-Fold CV: 0.9994).
    - Verified on unseen test set (Test Weighted F1: 1.0000).
    - Serialized best model artifact to `backend/model/best_model.joblib`.
  - **Inference Service (`backend/src/ml/predictor.py`)**:
    - Live inference wrapper returning predicted class, probability distribution, and top confidence.
- **Problems hit:** Text overlapping in Section 1 ("Apple Active Noise Cancelling Headphones" colliding with Category) and Section 2 ("Standard Warranty (Apple Care Protection)" colliding with Policy Duration). Resolved by allocating dedicated rows and expanding canvas to 1200x1680 with structured column budgeting.
- **Model failures:** Naive Bayes struggled with correlated boolean flags (F1: 0.8390). Tree ensembles (XGBoost, LightGBM, Random Forest) performed best.
- **Changes made:** Card generator, ML preprocessing, training pipeline, predictor, reports, and charts.
- **Tests run:** Verified live predictions for Valid, Invalid, and Manual Review claims via `TabularPredictor`.

---

*Entries will be added after every development session.*
