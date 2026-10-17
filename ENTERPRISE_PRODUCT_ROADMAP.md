# TalentFilter AI / HireLens
## Updated Engineering Roadmap and Implementation Checklist

**Document purpose:** Use this as the working plan for the next engineering iterations. It replaces unsupported production/compliance claims with verifiable status, prioritizes safety and reliability before adding more features, and keeps hiring decisions under authorized human control.

**Important scope note:** This is a roadmap based on the supplied product roadmap document, not an independent audit of the source code or deployed application. Existing feature claims must be verified against code, tests, configuration, and deployment evidence before being described as implemented or production-ready.

---

## 1. Product principles

1. **AI recommends; authorized humans decide.** The system must not automatically reject, shortlist, rank into a final decision, contact, or otherwise change a candidate's hiring outcome without the required human action.
2. **Show evidence, not just scores.** Every criterion match should link to the extracted evidence, source section/page when available, and a clear explanation of uncertainty.
3. **Use job-related criteria only.** Do not use protected or proxy attributes to score candidates. Blind screening can reduce exposure to some information, but it does not by itself prove fairness.
4. **Deterministic baseline first.** Keep a reproducible rule-based score as a baseline. Treat LLM output and semantic similarity as supplemental evidence, not unquestionable truth.
5. **Security and privacy are core requirements.** Resume files contain personal data. Access control, retention, deletion, tenant isolation, secure logging, and safe file processing must be designed early.
6. **Measure before claiming.** Performance, accuracy, fairness, and conversion metrics must be labeled as targets until measured using a documented and reproducible method.
7. **No absolute security or legal-compliance guarantees.** Report tested controls, known limitations, and review status accurately.

## 2. Status vocabulary

Use these labels in the roadmap, UI, README, and release notes:

- **Planned:** not yet implemented.
- **In progress:** work has started but acceptance criteria are not met.
- **Implemented, unverified:** code appears to exist, but required tests/evidence are incomplete.
- **Verified in test:** acceptance checks pass in a documented test environment.
- **Verified in production:** deployment and operational evidence confirms the capability works in the stated production configuration.
- **Blocked:** progress depends on a decision, access, vendor, or prerequisite.

A commit hash alone is not proof that a feature works. Link each verified item to a test, test result, or reproducible manual verification record.

---

## 3. Phase 0: Establish the real baseline

**Priority: P0. Do this before starting another feature.**

### 3.1 Architecture and repository inventory

- [ ] Confirm the actual backend framework and entry point. The intended architecture is **Next.js + FastAPI**; do not assume FastAPI exists until the repository confirms it.
- [ ] Document frontend, backend, database, ORM, migrations, queue, object/file storage, LLM providers, and deployment topology.
- [ ] Identify all API routes and map them to authentication, authorization, validation, and tests.
- [ ] Identify whether SQLite is development/test-only. Prefer PostgreSQL for production and CI integration tests.
- [ ] Record required environment variables without recording their secret values.
- [ ] Document how to install, run, migrate, test, build, and deploy from a clean checkout.
- [ ] Check for duplicate implementations, dead code, TODOs, mock endpoints, and UI controls that do not call real backend behavior.

### 3.2 Build a feature verification matrix

For every feature currently described as complete, record:

| Field | Required evidence |
|---|---|
| Feature | User-visible capability and its scope |
| Implementation | Relevant route, service, component, migration, or commit |
| Automated tests | Test names and latest result |
| Manual verification | Steps and observed result |
| Security/privacy checks | Relevant authorization, data handling, and abuse cases |
| Environment | Local, CI, staging, or production |
| Status | Use the status vocabulary above |
| Known limitations | What is not covered |

- [ ] Verify resume parsing, OCR fallback, file validation, matching, explainability, human decision gates, audit events, blind screening, fairness calculations, LLM fallback, webhooks, email preview, comparison, and rediscovery individually.
- [ ] Remove or qualify any claim that lacks evidence.
- [ ] Do not publish sample KPI values as current benchmarks unless they were measured and the benchmark method is documented.

**Exit criteria:** A clean install succeeds, the architecture is documented, critical flows have reproducible tests, and the feature matrix distinguishes verified behavior from assumptions.

---

## 4. Phase 1: Make the core screening workflow reliable

**Priority: P0. Complete before enterprise feature expansion.**

### 4.1 Job and candidate workflow

- [ ] Create and edit a job requisition with explicit, job-related criteria.
- [ ] Upload one resume and a batch of resumes.
- [ ] Track file processing states: queued, processing, succeeded, needs review, and failed.
- [ ] Make failed parsing visible and retryable without silently creating duplicate candidates.
- [ ] Store the original file securely and maintain a clear link between the extracted profile, evidence, job, and application.
- [ ] Support duplicate detection with a review path rather than silently merging uncertain matches.
- [ ] Provide candidate profile, evidence, criteria breakdown, reviewer notes, and decision history.
- [ ] Support explicit human decisions such as pending review, shortlisted, rejected, and withdrawn, with valid transitions and authorization checks.
- [ ] Require a reason for rejection if that is the chosen product policy. Keep the reason attributable to the authorized reviewer.
- [ ] Ensure an AI recommendation cannot itself transition a candidate to a final hiring decision.

### 4.2 Resume parsing and evidence quality

- [ ] Validate file extension, MIME type, file signature, file size, and page count. Do not trust the filename or browser-supplied MIME type.
- [ ] Allow only the file formats intentionally supported, initially PDF and DOCX.
- [ ] Run parsing in a resource-limited process with timeouts and safe temporary-file handling.
- [ ] Handle scanned PDFs through OCR when configured; report OCR uncertainty and extraction failures.
- [ ] Preserve section structure where practical: experience, education, skills, projects, and certifications.
- [ ] Store evidence spans and page/section references when the parser can reliably provide them.
- [ ] Distinguish “not found in the resume” from “candidate does not have the skill.”
- [ ] Avoid inferring years of experience or qualifications from ambiguous dates without showing the calculation and uncertainty.
- [ ] Add synthetic fixtures for multi-column resumes, tables, unusual fonts, scanned documents, empty files, malformed files, and mixed-language content.
- [ ] Establish a labeled evaluation set and measure extraction accuracy before claiming a percentage.

### 4.3 Matching and explainability

- [ ] Define a versioned scoring specification for required skills, preferred skills, experience, qualifications, and other explicitly job-related criteria.
- [ ] Validate weights, ranges, missing values, and normalization. Keep scoring behavior deterministic for the same input and version.
- [ ] Treat keyword and synonym matches as evidence, not proof of proficiency.
- [ ] Show matched, partially matched, missing, and uncertain criteria separately.
- [ ] Link every positive match to the resume evidence where possible.
- [ ] Explain score contribution per criterion and record the scoring version.
- [ ] Make clear that a score is decision support, not an objective measure of candidate worth or a hiring decision.
- [ ] Test negation, context, outdated skills, keyword stuffing, false positives, and relevant experience described without exact keywords.
- [ ] Keep the original deterministic score available if an LLM or semantic layer is added later.

**Exit criteria:** A recruiter can upload resumes, see extraction status, inspect evidence, understand each score, and record a human decision with an attributable audit record.

---

## 5. Phase 2: Security, privacy, and operational safeguards

**Priority: P0 before real customer or candidate data is used.**

### 5.1 Authentication and authorization

- [ ] Require authentication for all non-public application and API routes.
- [ ] Enforce server-side role and resource authorization. Hiding a button in the frontend is not authorization.
- [ ] Test direct-object access attempts, including changing candidate, job, application, file, and audit IDs.
- [ ] Define roles and permitted actions in a centralized policy layer.
- [ ] Protect administrative actions, export endpoints, webhook management, and audit access.
- [ ] Add rate limits and abuse controls to authentication, uploads, expensive parsing, LLM calls, and public-facing endpoints.
- [ ] Keep secrets out of source control, client bundles, logs, error responses, and example configuration files.
- [ ] Rotate credentials and document incident response procedures.

### 5.2 Tenant isolation

If the product serves multiple organizations, implement tenant isolation before onboarding multiple real customers.

- [ ] Add an explicit organization/tenant identifier to relevant records and queries.
- [ ] Derive tenant context from the authenticated identity, not from an untrusted request field alone.
- [ ] Apply tenant-scoped authorization consistently in services and background jobs.
- [ ] Add cross-tenant negative tests for every sensitive resource type.
- [ ] If PostgreSQL Row-Level Security is used, enforce it with correct database roles and test connection-pool/session context handling.
- [ ] Verify exports, search, rediscovery, analytics, webhooks, and audit logs cannot leak cross-tenant data.
- [ ] Document tenant migration and recovery procedures.

### 5.3 Secure file storage and processing

- [ ] Store uploads outside the web root or in private object storage.
- [ ] Use generated storage keys, not user-supplied paths.
- [ ] Prevent path traversal, archive/decompression bombs where applicable, parser exploits, and oversized documents.
- [ ] Never fetch arbitrary resume URLs from the server unless a carefully scoped feature requires it.
- [ ] If URL fetching exists, block loopback, private, link-local, reserved, and cloud-metadata destinations; re-check redirects and resolved IPs to mitigate DNS rebinding.
- [ ] Use short-lived authorized download links where object storage supports them.
- [ ] Remove temporary files on success, failure, timeout, and worker termination.
- [ ] Keep uploaded files and extracted personal data out of application logs.

### 5.4 Retention, deletion, and privacy

- [ ] Define retention periods by data category and customer policy.
- [ ] Implement an authorized deletion workflow for candidate records and source files.
- [ ] Include derived profiles, embeddings, cached content, exports, queues, and search indexes in deletion scope.
- [ ] Document backup retention and the practical limits/timing of deletion from backups.
- [ ] Record deletion requests and outcomes without preserving unnecessary personal data in the audit trail.
- [ ] Provide a data export process where required by product commitments and applicable law.
- [ ] Define consent/notice, lawful basis, processor/subprocessor, and data residency requirements with qualified counsel for each target market.
- [ ] Do not describe the product as GDPR/CCPA compliant solely because deletion endpoints exist.

### 5.5 Audit trail and observability

- [ ] Record who performed a sensitive action, what changed, when, on which resource, and under which tenant.
- [ ] Record recommendation version, input references, reviewer action, and override reason where appropriate.
- [ ] Do not put full resumes, secrets, or unnecessary personal data into audit events.
- [ ] Restrict audit access and protect records from ordinary application-level modification.
- [ ] If tamper evidence is claimed, document the threat model and test whether privileged database or infrastructure access can alter the trail.
- [ ] Add structured logs, error tracking, health checks, queue monitoring, alerting, backup checks, and a tested restore procedure.
- [ ] Set retention and access controls for operational logs.

**Exit criteria:** Authorization tests pass, tenant boundaries are verified if multi-tenant, files are safely handled, retention/deletion is documented and tested, and operational recovery is demonstrated.

---

## 6. Phase 3: LLM and semantic matching safety

**Priority: P1 after core workflow and baseline security.**

### 6.1 Safe LLM integration

- [ ] Treat every resume, job description, and external document as untrusted data.
- [ ] Keep document content clearly separated from system instructions. Sanitization alone is not a reliable prompt-injection defense.
- [ ] Do not let resume text choose tools, call arbitrary URLs, access secrets, or alter authorization.
- [ ] Give the model only the minimum data required for the specific task.
- [ ] Use strict structured output schemas and validate all model responses server-side.
- [ ] Treat malformed, missing, contradictory, or low-confidence output as unavailable, not as a positive match.
- [ ] Keep deterministic matching available when the LLM provider is down or returns invalid output.
- [ ] Apply timeouts, retry limits, concurrency limits, usage limits, and safe error handling.
- [ ] Document which provider receives candidate data, where it is processed, retention settings, and whether data may be used for provider training.
- [ ] Avoid sending identifiable resume content to external providers unless the organization has approved that data flow.
- [ ] Build adversarial tests with resumes containing instructions such as “ignore previous instructions,” hidden text, encoded text, fabricated credentials, and attempts to manipulate scores.
- [ ] Test for prompt injection, data leakage, biased recommendations, fabricated evidence, and unsafe tool behavior.

### 6.2 Human-reviewed calibration

- [ ] Keep weight calibration advisory and read-only initially.
- [ ] Do not automatically learn new scoring weights from recruiter overrides or historical hiring outcomes.
- [ ] Show the evidence, sample size, potential confounders, expected effect, and uncertainty behind every calibration suggestion.
- [ ] Require an authorized administrator to approve any scoring change.
- [ ] Version every scoring configuration and preserve the ability to roll back.
- [ ] Evaluate proposed changes on a held-out, representative dataset before release.
- [ ] Track reviewer disagreement as a signal for investigation, not automatically as proof that the reviewer is biased or the model is correct.
- [ ] Avoid optimizing only for shortlist conversion, which can reward a model that merely imitates past selection patterns.

### 6.3 Semantic search, only after baseline evaluation

- [ ] Establish a labeled benchmark for job-to-resume relevance before adding embeddings.
- [ ] Compare deterministic matching against semantic retrieval and a hybrid approach.
- [ ] Evaluate precision, recall, ranking quality, evidence accuracy, subgroup performance where legally and ethically appropriate, latency, and cost.
- [ ] Preserve criterion-level evidence and deterministic score explanations when semantic similarity is used.
- [ ] Version embedding models and re-indexing jobs; document deletion behavior for vectors.
- [ ] Use hybrid retrieval only if it improves measured quality without unacceptable safety, fairness, cost, or latency regressions.

**Exit criteria:** LLM and semantic features pass adversarial and quality tests, degrade safely, do not make autonomous hiring decisions, and have a documented data-flow review.

---

## 7. Fairness and regulatory governance

This product supports hiring decisions, a high-impact use case. Treat fairness tools as monitoring and risk-management aids, not legal certification.

- [ ] Define intended use, prohibited use, user roles, human oversight, and known limitations.
- [ ] Document the job-related rationale for each criterion and scoring weight.
- [ ] Assess whether protected attributes or proxies can influence recommendations, directly or indirectly.
- [ ] Do not infer sensitive demographic attributes from resumes to populate fairness dashboards.
- [ ] Use demographic analysis only where there is a lawful, appropriate basis, access controls, sufficient data quality, and a documented purpose.
- [ ] Explain the Four-Fifths Rule as a screening indicator, not a universal proof of fairness or legal compliance.
- [ ] Show group sample sizes, selection-rate denominators, uncertainty, time window, job family, and caveats alongside fairness metrics.
- [ ] Avoid firm conclusions for small or unreliable samples.
- [ ] Investigate adverse signals and document remediation. A dashboard alert is not a substitute for review.
- [ ] Keep audit records of model/scoring versions, tests, changes, reviewer decisions, and incident handling.
- [ ] Have qualified legal and employment-domain experts review the product for each target jurisdiction before making compliance claims.
- [ ] Assess applicable rules for automated employment decision tools, accessibility, candidate notice, explainability, and human review.
- [ ] Do not label the system “EEOC compliant,” “EU AI Act compliant,” or “bias-free” without a documented, qualified assessment supporting that exact claim.

---

## 8. Phase 4: Product improvements and integrations

Start these only after the relevant prerequisites are met.

### P1: Operational improvements

- [ ] Background processing for bulk uploads, with retry and dead-letter handling if a queue is needed.
- [ ] Idempotent processing and duplicate-safe webhook delivery.
- [ ] Clear processing progress, failure reasons, and safe retries.
- [ ] Accessible, responsive recruiter workflows.
- [ ] Search, filtering, pagination, and export controls with server-side authorization.
- [ ] Email preview and explicit human confirmation before sending candidate communications.
- [ ] Candidate comparison that presents evidence and limitations, not only score deltas.
- [ ] Talent-pool rediscovery that respects tenant, purpose, retention, and access restrictions.

### P2: Enterprise features

- [ ] SSO using OIDC or SAML, with secure account linking and session handling.
- [ ] SCIM provisioning only when identity lifecycle requirements are defined.
- [ ] Calendar scheduling with explicit permissions and safe token storage.
- [ ] HRIS connectors, beginning with one integration selected by actual customer demand.
- [ ] Webhook retries, signing, replay protection, event versioning, and delivery logs.
- [ ] Candidate portal with opaque, revocable tokens, minimal disclosure, and no internal score exposure.
- [ ] Advanced analytics only when metric definitions, access controls, and privacy constraints are clear.
- [ ] KMS-backed encryption when required by the deployment model, threat assessment, or customer commitments.

Avoid building multiple HRIS connectors, a public candidate portal, or advanced analytics before customer needs and the security model justify them.

---

## 9. Testing and release gates

### Required automated tests

- [ ] Unit tests for scoring, weight validation, synonym handling, parsing normalization, and decision state transitions.
- [ ] API tests for authentication, authorization, tenant isolation, input validation, pagination, and error handling.
- [ ] Integration tests against the production database engine, preferably PostgreSQL if it is the production target.
- [ ] Upload tests for malformed files, size limits, MIME/signature mismatch, OCR failure, timeouts, and duplicate uploads.
- [ ] Regression tests for known parsing and matching cases.
- [ ] LLM schema-validation, timeout, fallback, and adversarial prompt-injection tests.
- [ ] Webhook signature, replay, SSRF, redirect, DNS-resolution, retry, and timeout tests if applicable.
- [ ] Deletion tests covering source files and derived data.
- [ ] End-to-end tests for upload → parse → review evidence → recommendation → human decision → audit history.
- [ ] Accessibility checks for core recruiter workflows.

### Release checklist

- [ ] Database migrations tested from an empty database and from the previous release.
- [ ] Secrets and dependency scanning run in CI.
- [ ] No critical/high unresolved security findings without documented acceptance and mitigation.
- [ ] Backup restoration tested.
- [ ] Monitoring and rollback plan documented.
- [ ] Feature flags or staged rollout used for risky changes.
- [ ] Release notes list what changed, what was tested, and known limitations.
- [ ] No “production-ready” claim until deployment-specific operational checks pass.

---

## 10. Metrics: define first, then measure

Do not use illustrative values as current benchmarks. Establish baselines from a representative, privacy-reviewed dataset and document the measurement process.

| Area | Metric | Measurement notes |
|---|---|---|
| Parsing | Field extraction accuracy | Labeled resume set; report by document type and language |
| Evidence | Evidence attribution accuracy | Whether cited text actually supports the criterion |
| Matching | Precision/recall or ranking metrics | Human-labeled job-resume relevance benchmark |
| Review efficiency | Median active review time | Separate parsing wait time from recruiter review time |
| Reliability | Successful processing rate | Include failures, retries, and OCR-required cases |
| Performance | p50/p95 processing latency | Report file size, page count, concurrency, hardware, and provider |
| Safety | Unauthorized decision attempts blocked | Include negative tests and audit verification |
| Governance | Human override and disagreement rates | Investigate context; do not treat as ground truth alone |
| Fairness | Relevant selection-rate and error-rate analyses | Adequate samples, caveats, appropriate legal basis |
| Operations | Queue backlog, failure rate, recovery time | Use production telemetry |
| Cost | Cost per processed application | Include OCR, LLM, storage, and infrastructure |

For every reported KPI, include: definition, numerator/denominator, dataset, time window, sample size, environment, test command or dashboard, and limitations. Separate **target**, **test result**, and **production measurement**.

Do not set a universal “zero-exploit guarantee.” State which tests and controls were applied and what remains untested.

---

## 11. Recommended execution order

1. **Inventory and verification:** prove what exists, fix documentation, and establish clean setup/tests.
2. **Core workflow:** reliable upload, parsing status, evidence, explainable score, human decision, audit history.
3. **Security baseline:** authentication, authorization, tenant isolation where applicable, safe file handling, retention/deletion, monitoring and backups.
4. **Evaluation baseline:** labeled parsing/matching fixtures, repeatable benchmark, and documented metrics.
5. **LLM safety:** strict schemas, provider data review, adversarial tests, fallback behavior, and human-reviewed output.
6. **Fairness governance:** metric definitions, sample-size caveats, review workflow, and qualified legal assessment.
7. **Quality improvements:** semantic search and calibration experiments only when benchmark evidence justifies them.
8. **Enterprise integrations:** prioritize by real customer demand and security readiness.

Do not skip ahead just because a feature is impressive in a demo. A reliable, explainable hiring workflow is more valuable than a long checklist of unverified enterprise features.

---

## 12. Instructions for the coding agent

When using an AI coding agent to implement this roadmap:

1. Inspect the existing repository before editing. Do not assume the architecture or rewrite working modules.
2. Begin by producing an inventory of the relevant files, current behavior, tests, and gaps for the selected task.
3. Work in small, reviewable increments. Preserve existing behavior unless a change is explicitly required.
4. Do not silently replace FastAPI with another backend or change the database strategy. Report any mismatch between the intended stack and actual code first.
5. For each task, state: problem, proposed change, files to modify, migration impact, security/privacy impact, and acceptance tests.
6. Implement the smallest safe change that meets the acceptance criteria.
7. Add or update tests and run them. Report the exact commands and actual results. Never claim tests passed if they were not run.
8. Do not add dependencies without explaining why they are needed.
9. Do not expose secrets or real candidate data in logs, fixtures, screenshots, or reports. Use synthetic data for development and testing.
10. Do not introduce automatic hiring decisions, automatic rejection, or unreviewed outbound candidate communication.
11. Do not claim legal compliance, fairness, performance, or production readiness without evidence.
12. Finish with a concise report: changed files, behavior changed, tests run and results, migration/configuration steps, known risks, and the next recommended task.
13. If the task reveals a foundational blocker, stop and report it rather than layering a feature on top of a broken assumption.

### Task template

```text
Task:
[One specific task from this roadmap]

Before coding:
- Inspect the current implementation and relevant tests.
- Report the existing behavior and the gap.
- Confirm dependencies and affected routes/data models.
- Identify security, privacy, and backward-compatibility risks.

Implementation:
- Make the smallest safe change.
- Preserve existing working behavior.
- Add tests for success, failure, authorization, and relevant abuse cases.
- Use synthetic data only.

Acceptance criteria:
- [Observable behavior]
- [Relevant tests pass]
- [Unauthorized/invalid behavior is rejected safely]
- [Audit and human-review requirements remain intact]

Final report:
- Files changed
- Summary of behavior
- Commands run and actual results
- Migration or environment changes
- Known limitations
- Recommended next task
```

---

## 13. Current next task

**Do this first:** complete Phase 0, then fix the highest-risk gaps discovered.

Deliverables for the first engineering pass:

- [x] **Repository architecture map, including explicit confirmation of the FastAPI backend status.** (Documented in [PHASE_0_BASELINE_AUDIT.md](file:///d:/laragon/www/python-scrapper/docs/PHASE_0_BASELINE_AUDIT.md#1-repository-architecture-map); FastAPI confirmed in `backend/app/main.py`).
- [x] **Feature verification matrix for every claimed completed capability.** (Documented in [PHASE_0_BASELINE_AUDIT.md](file:///d:/laragon/www/python-scrapper/docs/PHASE_0_BASELINE_AUDIT.md#2-feature-verification-matrix); all 15 core features mapped to tests and evidence-based labels).
- [x] **Clean-install and test instructions.** (Documented in [PHASE_0_BASELINE_AUDIT.md](file:///d:/laragon/www/python-scrapper/docs/PHASE_0_BASELINE_AUDIT.md#3-clean-install-migration--test-instructions); 27 backend tests and Next.js 14 build verified).
- [x] **Critical workflow test covering upload through human decision and audit history.** (Implemented in [`backend/tests/test_critical_screening_workflow.py`](file:///d:/laragon/www/python-scrapper/backend/tests/test_critical_screening_workflow.py); passing in test suite).
- [x] **List of P0 security/privacy blockers.** (Documented in [PHASE_0_BASELINE_AUDIT.md](file:///d:/laragon/www/python-scrapper/docs/PHASE_0_BASELINE_AUDIT.md#5-list-of-p0-security--privacy-blockers-before-real-candidate-data); identifies Multi-Tenant RLS, GDPR Article 17 Purge, and Token Blacklisting).
- [x] **Updated roadmap status using evidence-based labels.** (Completed; all features categorized as "Verified in test", "Planned", or "In progress").

**Immediate Next Milestone:** Resolve P0 Security & Privacy Blockers (GDPR Article 17 Candidate Purge & Multi-Tenant Isolation) as defined in Phase 2 before onboarding real candidate data.

Do not begin with pgvector, SSO, HRIS integrations, scheduling, or a candidate portal until this first pass is complete.

---

## 14. Definition of done

A task is done only when:

- The requested behavior works in the actual application.
- Relevant automated tests pass and the results are reported accurately.
- Authorization, privacy, failure paths, and regressions have been considered.
- Database and environment changes are documented.
- The UI communicates uncertainty and does not misrepresent recommendations as decisions.
- The audit trail captures material human actions without unnecessary personal data.
- Documentation describes the real implementation rather than intended future behavior.

**Product promise:** Help recruiters review job-related evidence more consistently and efficiently while preserving human accountability, candidate privacy, and transparent decision support.
