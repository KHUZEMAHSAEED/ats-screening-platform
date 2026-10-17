# Phase 0: Baseline Verification & Repository Architecture Audit
**TalentFilter AI / HireLens Engineering Governance**
**Date:** October 17, 2026 | **Auditor:** Coding Agent Pair Programming Team

---

## 1. Repository Architecture Map

### 1.1 Backend Framework & Entry Point Confirmation
- **Status:** **CONFIRMED: FastAPI (Python 3.13)**
- **Entry Point:** `backend/app/main.py`
  - Instantiates `app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)`
  - Sub-router: `app.include_router(api_router, prefix="/api/v1")` from `backend/app/api/v1/router.py`
  - Health check endpoint: `GET /health` -> `{"status": "healthy"}`
  - Root endpoint: `GET /` -> `{"message": "Welcome to ATS Screening System API", "docs": "/api/v1/docs"}`
  - Centralized exception handlers for `RequestValidationError` (422) and unhandled `Exception` (500)

### 1.2 Frontend Framework & Entry Point
- **Status:** **CONFIRMED: Next.js 14.2+ (App Router, TypeScript, Tailwind CSS)**
- **Root Directory:** `frontend/`
- **Entry Pages:**
  - `frontend/src/app/page.tsx` — Executive Dashboard with live status cards, candidate conversion rates, and fast actions.
  - `frontend/src/app/candidates/page.tsx` — Candidate pipeline directory with search, filtering, and floating comparison dock.
  - `frontend/src/app/candidates/[id]/page.tsx` — Candidate dossier with Blind Review toggle, AI Interview Guide, LLM Qualitative Dossier, Score Breakdown, and Decision Modal.
  - `frontend/src/app/candidates/compare/page.tsx` — 4-way side-by-side candidate comparison matrix.
  - `frontend/src/app/jobs/page.tsx` — Requisition manager with interactive screening criteria builder and weight sliders.
  - `frontend/src/app/upload/page.tsx` — Drag-and-drop multi-file resume uploader with real-time status.
  - `frontend/src/app/audit/page.tsx` — Compliance & Governance hub with EEOC 4/5ths Rule monitoring and Recruiter Calibration Advisor.

### 1.3 Database & ORM
- **ORM:** SQLAlchemy 2.0 declarative models (`backend/app/models/__init__.py`)
- **Engine Configuration:** `backend/app/core/database.py` with `pool_pre_ping=True`
- **Default Database:** SQLite (`sqlite:///./ats.db` with `check_same_thread=False`) for local development and unit tests.
- **Production Target:** PostgreSQL (connection string configurable via `DATABASE_URL` environment variable).
- **Schema Migrations:** Alembic configuration in `backend/alembic.ini` and `backend/alembic/versions/415bd85e9e31_initial_schema_setup.py`.

### 1.4 Background Worker & Queue
- **Default Mode:** `USE_IN_PROCESS_TASKS=true` (`backend/app/services/queue/in_process_worker.py`) using `concurrent.futures.ThreadPoolExecutor(max_workers=4)`.
- **Production Mode:** Celery application configured in `backend/app/services/queue/celery_app.py` backed by Redis (`REDIS_URL`).
- **Core Worker Task:** `process_resume_document_task` in `backend/app/services/queue/tasks.py`.

### 1.5 Object & File Storage
- **Directory:** Configurable via `UPLOAD_DIR` (defaults to local `uploads/` directory).
- **Validation:** `backend/app/core/file_validator.py` enforces:
  - Empty file detection (HTTP 400).
  - Maximum file size (15MB default, HTTP 413).
  - Whitelisted extensions (`.pdf`, `.docx`).
  - Magic byte validation (`%PDF-` for PDFs, `PK\x03\x04` + `word/document.xml` inspection for DOCX).
  - Filename sanitization to strip path traversal and special characters.
  - Filesystem path traversal containment using `os.path.commonpath`.

### 1.6 LLM Providers & Fallback
- **Service:** `backend/app/services/llm_service.py`
- **Supported Providers:**
  1. OpenAI API (`gpt-4o`, `gpt-4o-mini`) via `OPENAI_API_KEY`.
  2. Local Ollama (`llama3`, `mistral`) via `OPENAI_BASE_URL`.
  3. **Zero-Dependency Heuristic Fallback**: Deterministic rule-based synthesizer when external providers are offline, unconfigured, or failing.
- **Safety Shield:** `sanitize_llm_input` filters adversarial prompt injection phrases (e.g., `ignore previous instructions`, `system prompt:`) before synthesis.

### 1.7 API Route to Test & Schema Mapping

| Route Prefix | Endpoints | Auth / Role | Pydantic Schemas | Automated Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `POST /login`, `GET /me` | Public / Bearer Token | `LoginRequest`, `TokenResponse`, `UserResponse` | `test_enterprise_features.py`, `test_human_in_the_loop.py`, `test_critical_screening_workflow.py` |
| `/api/v1/jobs` | `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `POST /{id}/archive` | HR Admin / Recruiter | `JobCreate`, `JobUpdate`, `JobResponse`, `JobListResponse` | `test_candidate_workflows.py`, `test_critical_screening_workflow.py` |
| `/api/v1/resumes` | `POST /upload`, `GET /{id}/file`, `POST /{id}/retry`, `GET /tasks/{id}` | HR Admin / Recruiter | `BulkUploadResponse`, `UploadFileResult`, `ProcessingTaskResponse` | `test_parsing.py`, `test_candidate_workflows.py`, `test_critical_screening_workflow.py` |
| `/api/v1/candidates` | `GET /`, `GET /{id}`, `POST /compare` | Bearer Token (Recruiter) | `CandidateListItem`, `CandidateDetailResponse`, `CandidateComparisonResponse` | `test_enterprise_features.py`, `test_critical_screening_workflow.py` |
| `/api/v1/applications` | `POST /{id}/decide`, `POST /{id}/notes`, `GET /{id}/notes` | HR Admin / Recruiter | `HRDecisionCreate`, `HRDecisionResponse`, `CandidateNoteCreate` | `test_human_in_the_loop.py`, `test_critical_screening_workflow.py` |
| `/api/v1/matching` | `POST /evaluate`, `POST /re-evaluate` | Bearer Token | `MatchRequest`, `MatchResultResponse` | `test_matching.py` |
| `/api/v1/stats` | `GET /summary` | Bearer Token | `DashboardSummary` | `test_enterprise_features.py` |
| `/api/v1/audit` | `GET /` | Bearer Token | `AuditLogListResponse` | `test_human_in_the_loop.py`, `test_critical_screening_workflow.py` |
| `/api/v1/export` | `GET /candidates.csv` | Bearer Token | Streaming CSV FileResponse | `test_candidate_workflows.py` |
| `/api/v1/compliance` | `GET /metrics` | Bearer Token | `ComplianceMetricsResponse` | `test_enterprise_features.py` |
| `/api/v1/interviews` | `GET /{id}`, `POST /{id}/generate` | Bearer Token | `InterviewGuideResponse` | `test_enterprise_features.py` |
| `/api/v1/webhooks` | `GET /`, `POST /`, `DELETE /{id}` | HR Admin | `WebhookSubscriptionResponse`, `WebhookCreate` | `test_enterprise_features.py` |
| `/api/v1/rediscovery`| `GET /{job_id}` | Bearer Token | `RediscoveryResponse` | `test_enterprise_features.py` |
| `/api/v1/communications` | `POST /preview`, `POST /send`, `GET /{id}` | Bearer Token | `EmailPreviewRequest`, `SendEmailRequest`, `CommunicationLogResponse` | `test_enterprise_features.py`, `test_critical_screening_workflow.py` |
| `/api/v1/ai-analysis` | `GET /{id}`, `POST /{id}/regenerate` | Bearer Token | `LLMAnalysisResponse` | `test_enterprise_features.py` |
| `/api/v1/calibration` | `GET /{job_id}`, `POST /{job_id}/apply` | HR Admin | `JobCalibrationAnalysisResponse`, `ApplyCalibratedWeightsResponse` | `test_enterprise_features.py` |

---

## 2. Feature Verification Matrix

Status vocabulary used:
- **Verified in test:** Verified with passing automated integration/unit tests in this repository.
- **Verified in production:** Operational evidence in production deployment (requires live customer deployment).
- **Implemented, unverified:** Code exists but lacks automated tests or verification.
- **Planned:** Documented roadmap item not yet implemented.
- **In progress:** Implementation started but incomplete.
- **Blocked:** Prerequisite missing.

| Feature | Implementation Files | Automated Test | Manual Verification Steps | Security & Privacy Controls | Environment | Status | Known Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PDF & DOCX Parsing** | `services/parsing/pdf_parser.py`, `docx_parser.py`, `extractor.py` | `test_parsing.py::test_extract_*` | Upload sample resumes via `/upload` UI | Magic-byte checks, 15MB limit, path sanitization | Local / CI | **Verified in test** | Complex multi-column tables with unusual non-standard fonts can yield fragmented text. |
| **OCR Fallback** | `services/parsing/ocr_engine.py` | `test_parsing.py` | Upload scanned image-only PDF | Resource-isolated process, timeout handling | Local / CI | **Verified in test** | Requires system Tesseract binary installed (`TESSERACT_CMD`). |
| **Deterministic Matching Engine** | `services/matching/engine.py`, `normalizer.py`, `synonym_dict.py` | `test_matching.py::test_matching_with_synonyms` | Create job criteria with weights and review score | Reproducible mathematical scoring; no non-deterministic drift | Local / CI | **Verified in test** | Rule dictionary relies on curated synonyms; nontraditional phrasing may require semantic search. |
| **Score Explainability** | `services/matching/explainability.py` | `test_matching.py`, `test_critical_screening_workflow.py` | Inspect score breakdown drawer on candidate dossier | Transparent point allocation; mandatory human oversight notice | Local / CI | **Verified in test** | Explanations are currently structured text summaries, not visual bounding boxes on PDF. |
| **Human Decision Gates (HITL)** | `api/v1/endpoints/decisions.py` | `test_human_in_the_loop.py::test_rejection_*` | Attempt rejection without confirmation or reason in UI modal | Server-side validation rejects unconfirmed/reasonless actions (HTTP 400) | Local / CI | **Verified in test** | Rejection reasons are free-form text; standard rejection taxonomy tags not yet enforced. |
| **Immutable Audit Logging** | `services/audit_service.py`, `models/__init__.py:AuditLog` | `test_human_in_the_loop.py`, `test_critical_screening_workflow.py` | Review audit trail timeline on `/audit` | Captures user ID, email, IP, action, and diffs; no full resume text stored | Local / CI | **Verified in test** | Audit log is stored in application database; hardware WORM or external tamper-evident ledger not attached. |
| **Blind Screening Mode** | `api/v1/endpoints/candidates.py`, `components/CandidateTable.tsx` | `test_enterprise_features.py::test_blind_*`, `test_critical_screening_workflow.py` | Toggle "Blind Review" switch on candidate dossier | Masks full name (`Candidate #[anon_id]`), email, phone, location, graduation year, and university | Local / CI | **Verified in test** | Freeform text in candidate summary or project descriptions could theoretically leak identity if unedited. |
| **EEOC 4/5ths Rule Auditing** | `services/compliance_service.py`, `app/audit/page.tsx` | `test_enterprise_features.py::test_eeoc_compliance_endpoint` | Visit `/audit` and inspect adverse impact alerts | Uses aggregated demographic selection statistics | Local / CI | **Verified in test** | Statistical validity requires statistically significant sample sizes (>30 applicants per group). |
| **AI Interview Question Synthesizer** | `services/interview_service.py`, `app/candidates/[id]/page.tsx` | `test_enterprise_features.py::test_interview_guide_generation` | Click "AI Interview Probes" on candidate page | Targets identified qualification gaps; outputs 1-5 rubrics | Local / CI | **Verified in test** | Generated questions are advisory tools for recruiters; questions must be reviewed before panel use. |
| **Outbound Webhook Dispatcher** | `services/webhook_service.py`, `api/v1/endpoints/webhooks.py` | `test_enterprise_features.py::test_webhook_lifecycle_and_ssrf_protection` | Register webhook endpoint in test suite | HMAC-SHA256 signature (`X-Hub-Signature-256`); SSRF blocks loopback, private IPs & `169.254.169.254` | Local / CI | **Verified in test** | Webhook delivery is synchronous; exponential retry queues (Celery/RabbitMQ) required for enterprise scale. |
| **Talent Pool Rediscovery** | `services/rediscovery_service.py`, `components/TalentRediscoveryModal.tsx` | `test_enterprise_features.py::test_talent_rediscovery` | Click "Talent Rediscovery" on job requisition page | Scoped to existing candidate applications; scores against new criteria | Local / CI | **Verified in test** | Performs on-demand matching; cross-organization candidate pooling is intentionally restricted. |
| **Candidate Comparison Matrix** | `services/comparison_service.py`, `app/candidates/compare/page.tsx` | `test_enterprise_features.py::test_candidate_comparison_matrix` | Select 2-4 candidates and click "Compare" | Server validates 2-4 candidate bounds; supports blind mode comparison | Local / CI | **Verified in test** | Comparison is capped at 4 candidates simultaneously for visual cognitive ergonomics. |
| **Candidate Communication Hub** | `services/communication_service.py`, `components/EmailModal.tsx` | `test_enterprise_features.py::test_candidate_communication_flow`, `test_critical_screening_workflow.py` | Open "Contact Candidate" modal and preview email | Strict HITL preview safeguard (`confirmed_by_recruiter: true` required); logs all messages | Local / CI | **Verified in test** | In-app mock SMTP/dispatch logger; integration with SendGrid/Resend API needed for live external emailing. |
| **Real-Time LLM Hybrid Reasoning** | `services/llm_service.py`, `api/v1/endpoints/llm_analysis.py` | `test_enterprise_features.py::test_ai_deep_analysis_and_injection_defense` | View "AI Qualitative Reasoning Dossier" on candidate page | Input prompt sanitization; zero-dependency fallback when offline | Local / CI | **Verified in test** | Heuristic fallback provides structured qualitative analysis but does not generate novel prose. |
| **Recruiter Calibration Advisor** | `services/calibration_service.py`, `components/CalibrationModal.tsx` | `test_enterprise_features.py::test_job_calibration_and_active_learning` | Visit `/audit` -> Calibration tab | Calculates reviewer severity bias and recommends weight adjustments using bounded formula | Local / CI | **Verified in test** | Calibration is strictly advisory; does not autonomously alter weights without human approval. |

---

## 3. Clean-Install, Migration & Test Instructions

### 3.1 Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 18+ (Node.js 20+ recommended)
- Optional: PostgreSQL 15+, Redis 7+

### 3.2 Backend Setup & Test Execution
```bash
# 1. Navigate to backend directory
cd backend

# 2. Activate virtual environment (Windows PowerShell)
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment configuration
cp ../.env.example .env

# 5. Run database migrations (or auto-create via SQLAlchemy)
alembic upgrade head

# 6. Execute complete test suite (27 tests)
python -m pytest tests -v
```

### 3.3 Frontend Setup & Production Build
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
cmd /c npm install

# 3. Run production build (verifies all 9 routes statically prerender)
cmd /c npm run build

# 4. Run development dev server
cmd /c npm run dev
```

### 3.4 Verification Command Results
- **Pytest Suite:** `27 passed, 2 warnings in 10.32s` (100% passing rate).
- **Next.js Production Build:** `✓ Compiled successfully`, `✓ Generating static pages (9/9)`. Zero type errors.

---

## 4. Critical Workflow Verification Summary

Automated End-to-End Test: `backend/tests/test_critical_screening_workflow.py`
Verified Steps:
1. **Job Creation (`POST /api/v1/jobs`):** Created requisition with mandatory/preferred criteria and weights -> Returned HTTP 201 Created.
2. **Resume Upload (`POST /api/v1/resumes/upload`):** Uploaded synthetic PDF in-memory -> File validated, SHA-256 hashed, background parsing worker dispatched -> Returned HTTP 200 OK.
3. **Async Parsing & Deterministic Scoring (`GET /api/v1/candidates/{app_id}`):** Polled until background thread completed -> Verified extracted name, email, mandatory criteria matching (>50 score), and mandatory human oversight notice.
4. **Blind Screening Redaction (`GET /api/v1/candidates/{app_id}?blind_mode=true`):** Verified full name converted to `Candidate #[anon_id]`, email masked to `[REDACTED (Blind Review Mode)]`, phone/location redacted, and university masked to `[REDACTED University/College]`.
5. **HITL Rejection Safeguard (`POST /api/v1/applications/{app_id}/decide`):** Attempted unconfirmed decision without justification -> Blocked with HTTP 400 Bad Request.
6. **Authorized Human Decision (`POST /api/v1/applications/{app_id}/decide`):** Submitted `SHORTLISTED` decision with justification -> State committed and attributed to reviewer -> Returned HTTP 200 OK.
7. **Audit Log Verification (`GET /api/v1/audit?application_id={app_id}`):** Verified `RESUME_UPLOADED` and `HR_DECISION_SHORTLISTED` logged with reviewer email, timestamp, and details.
8. **Candidate Communication Preview (`POST /api/v1/communications/preview`):** Previewed interview invitation template with dynamic variable interpolation (candidate name, job title).
9. **Candidate Communication Dispatch (`POST /api/v1/communications/send`):** Verified explicit recruiter confirmation checkbox (`confirmed_by_recruiter: true`) is enforced -> Dispatched and recorded to communication history.

---

## 5. List of P0 Security & Privacy Blockers (Before Real Candidate Data)

Before onboarding real candidate data from real enterprise customers, the following P0 items must be resolved:

1. **Multi-Tenant Row-Level Security (RLS) Isolation**:
   - *Current State:* Single-tenant schema. All authenticated recruiters can query all jobs and candidates across the instance.
   - *Requirement:* Add `tenant_id` to `User`, `Job`, `Candidate`, `JobApplication`, `ResumeDocument`, and `AuditLog`. Enforce tenant-scoped queries or PostgreSQL RLS policies so no cross-organization data leakage is possible.
2. **GDPR Article 17 Candidate Erasure ("Right to be Forgotten") Endpoint**:
   - *Current State:* Deletions can only be executed manually by database administrators.
   - *Requirement:* Authorized API endpoint (`DELETE /api/v1/candidates/{id}/purge`) that purges candidate PII, removes stored PDF/DOCX files from disk, anonymizes audit entries, and issues an erasure verification receipt.
3. **Session Revocation & Centralized Token Invalidation**:
   - *Current State:* JWT tokens are stateless with 24-hour expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
   - *Requirement:* Implement token blacklisting / Redis token blocklist so that when a recruiter's account is deactivated or compromised, active tokens can be immediately revoked.
4. **External Email Service Integration & Rate Limiting**:
   - *Current State:* Communication hub logs emails to the database without connecting to external SMTP/API.
   - *Requirement:* Integrate production transactional mail provider (SendGrid, AWS SES, or Resend) with strict domain validation (SPF/DKIM) and per-user dispatch rate limiting.
5. **PostgreSQL Production Target Hardening**:
   - *Current State:* Local SQLite database used for development.
   - *Requirement:* Deploy PostgreSQL 15+ in production Docker configuration, verify migration script idempotency, and run integration tests against PostgreSQL.

---

## 6. Phase 0 Completion Status

All Phase 0 deliverables specified in Section 13 of the Engineering Roadmap have been delivered, verified, and documented.
