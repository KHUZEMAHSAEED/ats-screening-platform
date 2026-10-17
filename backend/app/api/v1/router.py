from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, jobs, resumes, candidates, decisions, notes, audit, export, stats, matching,
    compliance, interviews, webhooks, rediscovery, communications, llm_analysis
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Job Openings"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["Candidates"])
api_router.include_router(decisions.router, prefix="/applications", tags=["HR Decisions"])
api_router.include_router(notes.router, prefix="/applications", tags=["Candidate Notes"])
api_router.include_router(matching.router, prefix="/matching", tags=["Matching Engine"])
api_router.include_router(stats.router, prefix="/stats", tags=["Dashboard Statistics"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance & Bias Auditing"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["AI Interview Guides"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Enterprise Webhooks"])
api_router.include_router(rediscovery.router, prefix="/rediscovery", tags=["Talent Rediscovery"])
api_router.include_router(communications.router, prefix="/communications", tags=["Candidate Communications"])
api_router.include_router(llm_analysis.router, prefix="/ai-analysis", tags=["AI Hybrid Reasoning"])

