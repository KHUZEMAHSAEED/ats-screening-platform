# TalentFilter AI — Enterprise ATS Resume Screening & Candidate Governance System

TalentFilter AI is an enterprise-grade Applicant Tracking System (ATS) designed for HR recruitment teams. It automates candidate parsing, extracts structured qualifications, calculates deterministic match scores against job-specific screening criteria, and enforces **Mandatory Human-in-the-Loop (HITL)** decision governance.

---

## 1. Core Architectural Principles

1. **Deterministic & Explainable Foundation**:
   Candidate matching is rooted in deterministic rules, case-insensitive keyword parsing, word-boundary protection, synonym dictionaries, and configurable criteria weights. Scores are 100% explainable down to exact text evidence snippets.
2. **Strict Human-in-the-Loop (HITL) Governance**:
   **The system NEVER automatically rejects candidates or makes hiring decisions.** Automated recommendations (`RECOMMENDED_FOR_SHORTLISTING`, `NEEDS_HR_REVIEW`, `DOES_NOT_MEET_CRITERIA`, `PROCESSING_FAILED`) and Final HR Decisions (`PENDING_REVIEW`, `SHORTLISTED`, `ON_HOLD`, `REJECTED`) are strictly decoupled in the schema. Final rejections require explicit human confirmation and non-empty justification.
3. **Multi-Job Candidate Portability**:
   Candidates can be screened across multiple job openings without overwriting job-specific scores or audit histories.
4. **Resilient Parsing & Graceful Fallbacks**:
   PDF parsing via PyMuPDF (`fitz`), DOCX parsing via `python-docx`, and OCR fallback for scanned documents via Tesseract. Unreadable or corrupted documents are flagged for manual review rather than rejected.
5. **Defense Against Prompt Injection**:
   Resumes are treated as untrusted data. Scoring rules cannot be overridden by embedded instructions (e.g. white-on-white text claiming "system override").

---

## 2. Technology Stack

### Frontend:
- **Framework**: Next.js 14+ (React 18, TypeScript, App Router).
- **Styling**: Tailwind CSS with custom styling and accessible components.
- **Icons**: Lucide React.
- **Client**: Typed API Client communicating with `/api/v1`.

### Backend:
- **Framework**: Python 3.11+ / 3.13 with FastAPI.
- **Validation**: Pydantic v2 schemas with `ConfigDict`.
- **Database & ORM**: PostgreSQL (primary) & SQLite (local fallback), SQLAlchemy 2.0 ORM.
- **Schema Migrations**: Alembic.
- **Queue & Async Processing**: Celery + Redis (production) and in-process ThreadPool worker (local zero-dependency fallback).
- **Document Parsers**: PyMuPDF (`pymupdf`), `python-docx`, Tesseract OCR fallback (`pytesseract`).
- **Security**: JWT authentication, bcrypt password hashing, magic-byte inspection, SHA-256 duplicate detection.

---

## 3. Directory Layout

```
python-scrapper/
├── backend/
│   ├── alembic/                      # Database migrations
│   │   ├── versions/                 # Version migration scripts
│   │   └── env.py
│   ├── app/
│   │   ├── api/v1/endpoints/         # Auth, Jobs, Resumes, Candidates, Decisions, Notes, Audit, Export
│   │   ├── core/                     # Config, Database, Security, File Validator
│   │   ├── models/                   # SQLAlchemy models
│   │   ├── schemas/                  # Pydantic v2 schemas
│   │   ├── services/                 # Parsing pipeline, Matching engine, Audit service, Task worker
│   │   └── main.py                   # FastAPI entrypoint & lifespan
│   ├── scripts/                      # Sample data generators
│   ├── tests/                        # Pytest automated test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── app/                      # App router: /, /candidates, /candidates/[id], /jobs, /upload, /audit
│   │   ├── components/               # Header, Sidebar, StatsCard, Table, DecisionModal, ScoreBreakdown, ResumeViewer
│   │   ├── lib/                      # Typed API client, Types, Utilities
│   │   └── styles/                   # globals.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── sample_data/                      # Synthetic test resumes (PDF & DOCX)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Local Quickstart (Without Docker)

### Prerequisites:
- Python 3.11+ or 3.13
- Node.js 18+ or 20+

### Step 1: Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Generate synthetic sample resumes and seed realistic job openings
python scripts/generate_sample_data.py

# Launch FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will automatically seed a default HR admin user:
- **Email**: `admin@example.com`
- **Password**: `AdminPass123!`
- **Interactive OpenAPI Docs**: `http://localhost:8000/api/v1/docs`

---

### Step 2: Start the Frontend

In a separate terminal:

```bash
cd frontend

# Install npm dependencies
npm install

# Run Next.js development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser. The application is pre-seeded with sample candidates, job openings, and screening metrics.

---

## 5. Running with Docker Compose

To run the complete production stack (PostgreSQL, Redis, Celery Worker, FastAPI Backend, Next.js Frontend):

```bash
# Copy template environment file
cp .env.example .env

# Build and start all services
docker compose up --build -d
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API & Docs**: `http://localhost:8000/api/v1/docs`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 6. Running Automated Tests

A comprehensive test suite verifies text extraction, duplicate detection, matching formulas, prompt injection resistance, and HITL decision invariants:

```bash
cd backend
.\venv\Scripts\pytest.exe
```

Output:
```
tests/test_candidate_workflows.py ...   [ 20%]
tests/test_human_in_the_loop.py ...     [ 40%]
tests/test_matching.py ...              [ 60%]
tests/test_parsing.py ......            [100%]
=================== 15 passed in 2.05s ===================
```

---

## 7. Matching Engine Scoring Formula

The matching engine computes candidate qualification scores using dynamic weighted criteria:

$$\text{Overall Score} = \frac{(W_{\text{mand}} \times S_{\text{mand}}) + (W_{\text{pref}} \times S_{\text{pref}}) + (W_{\text{exp}} \times S_{\text{exp}}) + (W_{\text{qual}} \times S_{\text{qual}})}{W_{\text{mand}} + W_{\text{pref}} + W_{\text{exp}} + W_{\text{qual}}}$$

### Default Weights:
- **Mandatory Skills ($W_{\text{mand}}$)**: `50%`
- **Preferred Skills ($W_{\text{pref}}$)**: `25%`
- **Relevant Experience ($W_{\text{exp}}$)**: `15%`
- **Required Qualifications ($W_{\text{qual}}$)**: `10%`

*Note: If a category is not configured for a job, its weight is not included in the denominator, normalizing only over active criteria.*

### Advisory Recommendation Categories:
- **`RECOMMENDED_FOR_SHORTLISTING`**: 100% mandatory skills verified, overall score $\ge 70\%$, experience requirement satisfied.
- **`NEEDS_HR_REVIEW`**: Partial match ($50\% - 69\%$) or uncertain extraction items detected (e.g. sparse document length or tenure ambiguities).
- **`DOES_NOT_MEET_CRITERIA`**: One or more mandatory skills missing, or score $< 50\%$. Candidate remains available for recruiter review; **not rejected automatically**.
- **`PROCESSING_FAILED`**: Document unreadable or corrupted. Kept accessible for manual inspection.

---

## 8. Security & Privacy Safeguards

1. **Anti-Bias & Privacy Protection**:
   Candidate evaluations strictly evaluate technical skills, employment tenure, and educational qualifications. Name, age, gender, race, ethnicity, and demographic proxies are completely excluded from matching algorithms.
2. **Untrusted Input Sanitation**:
   Resumes are inspected via magic bytes (`%PDF-` and ZIP header for DOCX) and stored with randomized UUID filenames outside web roots to prevent directory traversal.
3. **Prompt Injection Defense**:
   Deterministic regex and AST keyword parsing cannot be hijacked by hidden text instructions in resumes.
4. **Audit Trail Integrity**:
   Every recruiter decision, note, criteria change, and CSV export records an immutable audit log with user email, timestamp, and client IP address.

---

## 9. License

Proprietary and Confidential. Built for HR recruitment operations.
