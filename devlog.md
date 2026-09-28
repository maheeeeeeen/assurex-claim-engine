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

### Session 4: Teachable Machine Model & Dual Model Comparison Benchmark (Phase 3)
- **What was built:**
  - **Teachable Machine Architecture & Training (`backend/src/ml/train_teachable_machine.py`)**:
    - MobileNetV2 feature extractor backbone with GlobalAveragePooling2D, Dropout(0.2), Dense(128, ReLU), and Dense(3, Softmax) output head matching Google Teachable Machine specification.
    - Standard 224x224 RGB input with `[-1.0, 1.0]` pixel normalization.
    - Fast in-memory transfer learning workflow eliminating CPU starvation.
    - Exported `backend/model/teachable_machine/keras_model.h5` (10 MB), `labels.txt`, and `model_metadata.json`.
    - Achieved **95.47% Validation Accuracy** and **95.27% Weighted F1-score** across all 375 validation cards.
  - **Computer Vision Inference Service (`backend/src/ml/teachable_machine.py`)**:
    - Production `TeachableMachinePredictor` class supporting single image and vectorized batch predictions for file paths, PIL Images, byte streams, and base64 strings.
    - Optimized callable tensor execution in inference mode (`self.model(batch_tensor, training=False)`).
  - **Tabular Batch Inference Upgrade (`backend/src/ml/predictor.py`)**:
    - Added `predict_batch` for high-throughput vectorized tabular predictions.
  - **Dual Model Comparison Benchmark (`backend/src/ml/compare_models.py` - Deliverable 6)**:
    - Evaluated 35 unseen test claims across all categories and ground truths.
    - Dual-model agreement rate: **94.29%** (33/35 identical decisions).
    - Python Tabular Model Accuracy: **100.0%** (35/35).
    - Teachable Machine Image Model Accuracy: **94.29%** (33/35).
    - Mean Absolute Confidence Difference: **12.61%** (`|Tabular Conf - TM Conf|`).
    - Match breakdown: 15 Strong Matches (42.9%), 4 Acceptable Matches (11.4%), 11 Weak Matches (31.4%), 3 Weak Matches >25% (8.6%), 2 Disagreements (5.7%), 0 Uncertainties.
    - Exported `reports/model_comparison_30_claims.md` and `reports/model_comparison_30_claims.json`.
- **Problems hit:** Initial disk-bound `ImageDataGenerator` reading 3,500 uncompressed 1200x1680 PNGs on-the-fly bottlenecked single-threaded CPU I/O; resolved by caching balanced resized 224x224 arrays in memory, extracting bottleneck features once, and assembling the end-to-end Keras pipeline.
- **Model failures:** Minor divergence on 2 complex boundary claims (`CLM-00775` and `CLM-02103`) where tabular rule context required manual review while card visual appearance leaned valid — confirming the SRS architectural principle that dual-model disagreements should escalate to human review.
- **Changes made:** TM training script, TM predictor, batch predictor in tabular ML, compare_models benchmark, saved TM model artifacts, and comparison reports.
- **Tests run:** Tested live inference on demo cards (`sample_likely_valid.png`, `sample_likely_invalid.png`, `sample_manual_review.png`), verified all predictions, executed complete 35-claim benchmark suite.

### Session 5: Full Application Development & End-to-End Integration (Phase 4)
- **What was built:**
  - **Backend REST API Architecture & Services**:
    - `backend/src/models/entities.py`: Complete SQLModel ORM models (`User`, `Product`, `Warranty`, `Claim`, `ClaimAuditLog`) with JSON serialization fields for dual-model probability distributions, rule checklists, and audit events.
    - `backend/src/auth/service.py`: Bcrypt password hashing, PyJWT bearer token creation/validation, and RBAC security dependency factories (`get_current_user`, `require_role`).
    - `backend/src/services/rule_engine.py`: Deterministic business rule engine verifying purchase date chronologies, 7-day warranty grace windows, hardware serial reconciliation, covered/excluded damage categories, unauthorized repair voids, and duplicate submission checks.
    - `backend/src/services/ocr_service.py`: Receipt and invoice scanning engine detecting merchant headers, invoice dates, purchase totals, and hardware serial numbers.
    - `backend/src/services/card_service.py`: Dynamic 1200x1680 High-DPI Claim Summary Card generator rendering cards in real-time with zero model predictions/scores (strictly compliant with competition regulations).
    - `backend/src/services/adjudication_engine.py`: Multi-model arbitrator uniting Rule Engine + Tabular XGBoost + MobileNetV2 Vision AI to produce final adjudication status (`Auto-Approved`, `Auto-Rejected`, `Manual Review Required`), agreement flags, and confidence metrics.
    - Routers: `/api/auth` (register, login, profile), `/api/claims` (submit, list, search, stats, dossier detail, adjuster manual adjudication), `/api/products` (catalog), `/api/warranties` (coverage status), `/api/policies` (thresholds), `/api/admin` (telemetry, re-seed).
    - Vectorized Seeder (`backend/src/routers/admin.py`): Populated SQLite database (`backend/database/assurex.db`) with default demo roles (`admin`, `adjuster_sarah`, `customer_mike`), catalog products, and 35 benchmark claims evaluated through both AI models.
  - **Frontend Application (React + Vite + Recharts + Custom CSS)**:
    - Dark-themed UI design system (`frontend/src/index.css`) with glassmorphism, responsive cards, glow accents, and Google Fonts (`Plus Jakarta Sans` & `JetBrains Mono`).
    - `Dashboard.jsx`: KPI widgets (auto-approval %, auto-rejection %, dual-model agreement rate), interactive Recharts distribution donut and bar charts, and live claim stream.
    - `SubmitClaim.jsx`: Multi-step claim intake wizard with catalog pre-fill, receipt file upload, OCR pre-scan preview, and instant AI adjudication results modal.
    - `ClaimsList.jsx`: Searchable and filterable claims table with multi-attribute filtering (category, status, keyword).
    - `ClaimDetail.jsx`: Adjudication dossier with 1200×1680 Claim Summary Card viewer + full-screen zoom modal, dual-model probability comparison bars, 8-point rule verification checklist, audit log timeline, and adjuster decision action panel.
    - `ReviewQueue.jsx`: Adjuster review docket focused on disputed, low-confidence, or manual-review claims.
    - `Admin.jsx`: System diagnostics, model readiness check, and interactive confidence threshold sliders.
    - `Products.jsx`: Hardware asset registry with direct "File Claim" actions.
    - `Navbar.jsx` & `Login.jsx`: One-click demo profile selectors for Chief Admin, Lead Adjuster, and Customer.
  - **Automated Integration Test Suite (`backend/tests/test_e2e.py`)**:
    - Validates health check, authentication, KPI calculations, end-to-end claim submission with dynamic card generation, dual-model inference, and manual reviewer override. All tests passing with 100% success.
- **Problems hit & resolved:**
  - FastAPI Pydantic v2 validation required `product_id` to be optional for spontaneous claims — implemented dynamic ID fallback `PRD-{UUID}`.
  - Pydantic v2 `EmailStr` requirement bypassed by using standard `str` fields, preventing external dependency breakage.
  - Resolved pathing in `card_service.py` to prevent nested `backend/backend/uploads` directory creation.
- **Changes made:** Backend models, schemas, auth, routers, services, frontend pages, design system, test suite, and build bundle.
- **Tests run:** Executed `python -m tests.test_e2e` (ALL PASSED), verified frontend production build with `npm run build` (0 errors), and verified dual-model adjudication on live submissions.

### Session 6: Notifications, CSV/HTML Export, and Demo Claims Bundle
- **What was built:**
  - Implemented 30-day prior notification for expiring warranties (Issue 6) via `notifications.py` router and `NotificationDropdown.jsx`.
  - Added Export HTML Dossier and Export CSV buttons/endpoints (Issue 7) in `claims.py`, `ClaimsList.jsx`, and `ClaimDetail.jsx`.
  - Extracted 11 mandatory demo claims from the dataset and bundled them into `sample_claims/` (Issue 8).
- **Problems hit:** Minor issues with missing `FaDownload` import in React, successfully resolved.
- **Changes made:** `backend/src/routers/notifications.py`, `backend/src/routers/claims.py`, `frontend/src/components/NotificationDropdown.jsx`, `frontend/src/pages/ClaimsList.jsx`, `frontend/src/pages/ClaimDetail.jsx`.
- **Tests run:** Tested rendering of Export buttons and logic for 11 demo claims.

---

## Day 2 — 2026-09-27

### Session 7: 10K Dataset, 8 Warranty Policies, Re-Training, and Admin Analytics
- **What was built:**
  - Regenerated synthetic dataset from 2,500 to **10,000 claim records** across 6 product categories: Electronics, Appliances, Automotive, Smartphones & Mobile, Computers & Laptops, Wearables & Audio.
  - Added 5 new warranty policy JSON files (smartphones_and_mobile, computers_and_laptops, wearables_and_audio, home_office_and_furniture, power_tools_and_hardware) for a total of **8 policies**.
  - Re-trained all 8 tabular classifiers on the expanded 10,000-record dataset. Updated `model_comparison.md` and `model_comparison.json`.
  - Added Admin analytics dashboard tabs: `ClaimsAnalyticsTab.jsx`, `ModelPerformanceTab.jsx`, `OperationsTab.jsx`.
- **Problems hit:** None.
- **Changes made:** Dataset generator, all CSV splits, policy files, training pipeline, model artifacts, admin dashboard components.
- **Tests run:** Verified dataset shape (10,000 records), stratified split balance, re-trained model metrics, admin dashboard rendering.

### Session 8: Employee Role Support and User Profile Management
- **What was built:**
  - Added employee role support in auth and RBAC middleware.
  - Built `ProfileModal.jsx` for user profile viewing and editing (name, email, phone).
  - Added `PUT /api/auth/profile` endpoint for profile updates.
- **Problems hit:** None.
- **Changes made:** `backend/src/routers/auth.py`, `frontend/src/components/ProfileModal.jsx`, `frontend/src/components/Navbar.jsx`.
- **Tests run:** Verified profile update round-trip via API and UI.

### Session 9: Product Registration and Warranty Lifecycle Tracking
- **What was built:**
  - Product registration modal in frontend with unique `PRD-{UUID}` ID generation.
  - Automatic warranty record creation upon product registration with configurable duration.
  - Warranty status lifecycle tracking (Active, Expired, Grace Period).
- **Problems hit:** None.
- **Changes made:** `backend/src/routers/products.py`, `frontend/src/pages/Products.jsx`.
- **Tests run:** Verified product creation, warranty auto-generation, and status display.

### Session 10: Role-Based Access Control Enforcement
- **What was built:**
  - Applied `require_role()` guards across all API routes.
  - Added frontend route protection via `ProtectedRoute.jsx` with role-based sidebar and navigation filtering.
  - Scoped data visibility: customers see only their own products, warranties, and claims.
- **Problems hit:** None.
- **Changes made:** All routers (claims, products, warranties, admin, policies), `ProtectedRoute.jsx`, `Navbar.jsx`, `App.jsx`.
- **Tests run:** `backend/tests/test_rbac.py` — verified access control across all 4 roles.

### Session 11: Claim Form Redesign and Media Uploads
- **What was built:**
  - Reset claim form to empty defaults instead of pre-filled sample data.
  - Added product autofill from catalog selection with overwrite protection and mismatch warnings.
  - Added fault evidence, damage photo, and barcode image uploads with SHA-256 persistence and dossier preview thumbnails.
  - Added product warranty status indicator on the claim form.
- **Problems hit:** None.
- **Changes made:** `frontend/src/pages/SubmitClaim.jsx`, `backend/src/routers/claims.py`.
- **Tests run:** `backend/tests/test_task1_media_upload.py` — verified file upload, hash persistence, and retrieval.

### Session 12: Product Ownership and Warranty Validation
- **What was built:**
  - Restricted claim submission to registered, owned products with active warranty coverage.
  - Claims against unregistered, unowned, or expired-warranty products are rejected at submission time.
- **Problems hit:** None.
- **Changes made:** `backend/src/routers/claims.py`, `frontend/src/pages/SubmitClaim.jsx`.
- **Tests run:** `backend/tests/test_task3_product_warranty_restriction.py`.

### Session 13: Warranty Card Upload
- **What was built:**
  - Warranty card file upload endpoint with SHA-256 hash persistence.
  - Dossier preview rendering of warranty card alongside receipt and other documents.
- **Problems hit:** None.
- **Changes made:** `backend/src/routers/claims.py`, `frontend/src/pages/SubmitClaim.jsx`, `frontend/src/pages/ClaimDetail.jsx`.
- **Tests run:** `backend/tests/test_task1_warranty_card_upload.py`.

### Session 14: Cross-Document Serial and Model Number Verification
- **What was built:**
  - `OCRService.cross_verify_all()`: comprehensive cross-check of entered serial/model vs. receipt, warranty card, and barcode/product photo OCR extractions.
  - Inter-document comparisons (receipt vs. warranty card vs. barcode).
  - API endpoint `/api/claims/cross-verify` and frontend integration.
- **Problems hit:** None.
- **Changes made:** `backend/src/services/ocr_service.py`, `backend/src/routers/claims.py`, `frontend/src/pages/SubmitClaim.jsx`.
- **Tests run:** `backend/tests/test_task2_cross_verification.py`.

---

## Day 3 — 2026-09-28

### Session 15: Semantic Duplicate Claim Detection
- **What was built:**
  - `DuplicateDetector` service with 4 detection factors: cryptographic document hash, invoice number match, semantic fault description similarity (SequenceMatcher + token Jaccard/Dice), and repeated hardware serial number.
  - Synonym table and lightweight stemmer for fault description normalization.
  - API endpoint `/api/claims/check-duplicate` and frontend integration.
- **Problems hit:** None.
- **Changes made:** `backend/src/services/duplicate_detector.py`, `backend/src/routers/claims.py`, `frontend/src/pages/SubmitClaim.jsx`.
- **Tests run:** `backend/tests/test_task3_semantic_duplicate.py`.

### Session 16: TM Model Re-Integration (Keras 3 Compatibility)
- **What was built:**
  - Rebuilt `TeachableMachinePredictor._reconstruct_and_load_h5()` to reconstruct the full MobileNetV2 (alpha=1.0) architecture and load weights layer-by-layer from the legacy H5 file.
  - Added automatic native `.keras` format caching for fast subsequent boots.
  - Added canonical label name mapping from Teachable Machine export labels to display labels.
- **Problems hit:** Keras 3 dropped support for `model_config`-based H5 loading used by Teachable Machine exports. Solved by reconstructing the architecture programmatically and transferring weights.
- **Changes made:** `backend/src/ml/teachable_machine.py`.
- **Tests run:** Verified model loads correctly and produces valid predictions on demo cards.

### Session 17: Bug Fixes (Issues 1–5)
- **What was fixed:**
  - **Issue 1:** Chronological date contradiction detection — fixed comparison logic in `generate_cards.py` and `rule_engine.py` to correctly flag claims where purchase date is after submission date.
  - **Issue 2:** Warranty remaining days calculation — changed to calculate relative to submission date rather than current date.
  - **Issue 3:** Borderline claim routing — updated `adjudication_engine.py` to route claims with low-confidence AI predictions (both models < 0.60) or strong model disagreement (gap > 0.40) to Manual Review instead of auto-rejection, per SRS Step 12.
  - **Issue 4:** Vision model architecture mismatch — restored correct MobileNetV2 alpha=1.0 architecture (1280 pooled features) from backup weights to match the original Teachable Machine training configuration.
  - **Issue 5:** Serial number duplicate detection — added Factor 4 to `DuplicateDetector` that flags any prior active claim on the same hardware serial number, regardless of fault description similarity.
- **Problems hit:** MobileNetV2 alpha=0.35 (320 pooled features) was incorrectly used after an earlier refactor; restored to alpha=1.0 (1280 features) matching the backup weight shapes.
- **Changes made:** `backend/dataset_generator/generate_cards.py`, `backend/src/services/rule_engine.py`, `backend/src/services/adjudication_engine.py`, `backend/src/ml/teachable_machine.py`, `backend/src/services/duplicate_detector.py`.
- **Tests run:** Re-ran `test_e2e.py`, `test_batch3_ocr.py`, `test_task3_semantic_duplicate.py`. All passing.

### Session 18: Final Amendments
- **What was built:** Minor UI and backend polish, final cleanup before submission.
- **Problems hit:** None.
- **Changes made:** Various minor adjustments across routers and frontend pages.
- **Tests run:** Full test suite re-run, all passing.

---

*Entries will be added after every development session.*
