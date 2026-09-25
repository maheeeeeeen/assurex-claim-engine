# AssureX Claim Engine

> AI-Powered Warranty Claim Validation Application

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

The AssureX Claim Engine is a full-stack web application that automates warranty claim validation using dual AI models and configurable business rules. It processes claim information through a **Python classification model** and a **Google Teachable Machine image model**, compares their predictions, applies warranty rule validation, and produces a final decision: **Likely Valid**, **Likely Invalid**, or **Manual Review Required**.

## Architecture

- **Backend:** FastAPI + Uvicorn (pure JSON API)
- **Frontend:** React (Vite) + Bootstrap + React Router
- **Database:** SQLite via SQLModel ORM
- **Auth:** JWT (python-jose + passlib), role-based access (customer/employee/reviewer/admin)
- **ML (tabular):** scikit-learn, XGBoost, LightGBM — 8 models trained and compared
- **ML (image):** Google Teachable Machine (Keras export)
- **OCR:** pytesseract (Tesseract)

## Project Structure

```
assurex-claim-engine/
├── README.md
├── AI_USAGE.md
├── LICENSE
├── devlog.md
├── backend/
│   ├── requirements.txt
│   ├── src/
│   │   ├── main.py              # FastAPI app + CORS config
│   │   ├── database_setup.py    # SQLModel + SQLite engine
│   │   ├── routers/             # API route handlers
│   │   ├── models/              # SQLModel table definitions
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── services/            # Business logic: rules engine, OCR, comparison
│   │   └── auth/                # JWT auth, password hashing, role guards
│   ├── data/                    # Generated datasets (CSV)
│   ├── notebooks/               # Model training/exploration
│   ├── model/                   # Saved .pkl/.joblib models + encoders
│   │   └── teachable_machine/   # Exported TM model + labels
│   ├── policies/                # Warranty policy JSON files (3 policies)
│   ├── dataset_generator/       # Scripts to generate 2,500 claims + cards
│   ├── database/                # SQLite file + seed scripts
│   ├── tests/                   # pytest test cases
│   ├── uploads/                 # Uploaded documents
│   └── config/                  # Thresholds, settings
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/                 # axios instance + endpoint wrappers
│       ├── context/             # AuthContext (JWT storage, role)
│       ├── pages/               # One file per route
│       ├── components/          # Reusable UI pieces
│       └── routes/              # Protected/role-based route wrappers
├── sample_claims/               # Demo claims for testing
├── documentation/               # Report, diagrams
├── screenshots/                 # TM training, app screenshots
└── reports/                     # Model comparison report, analytics
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Tesseract OCR installed ([installation guide](https://github.com/tesseract-ocr/tesseract))

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:8000`.

### API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive Swagger documentation.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@assurex.com | Admin@123 |
| Employee | employee@assurex.com | Employee@123 |
| Reviewer | reviewer@assurex.com | Reviewer@123 |
| Customer | customer@assurex.com | Customer@123 |

## Dataset

- **2,500** synthetic warranty claim records
- **3 classes:** Valid Claim (~833), Invalid Claim (~833), Manual Review (~834)
- **Stratified split:** 70% train (1,750) / 15% validation (375) / 15% test (375)
- Claim Summary Card images generated for each record (2+ variants per training record)

## Models

### Python Classification Models (8 compared)

1. Logistic Regression
2. Decision Tree
3. Random Forest
4. XGBoost
5. LightGBM
6. SVM
7. KNN
8. Naive Bayes

Best model selected by weighted F1-score. See `reports/model_comparison.csv`.

### Google Teachable Machine

Image classification on Claim Summary Cards. Exported as Keras model.

## Warranty Policies

Three configurable JSON policy files in `backend/policies/`:
- `electronics_warranty.json`
- `appliances_warranty.json`
- `automotive_warranty.json`

## Testing

```bash
cd backend
pytest tests/ -v
```

## Deployment

Deployed at: *[URL will be added after deployment]*

## Blog

Technical blog: *[URL will be added after publication]*

## License

MIT — see [LICENSE](LICENSE).
