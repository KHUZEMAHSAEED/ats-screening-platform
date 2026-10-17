from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import User
from app.schemas.llm_analysis import LLMAnalysisResponse
from app.services.llm_service import perform_ai_deep_analysis, get_cached_ai_analysis

router = APIRouter()

@router.get("/{application_id}", response_model=LLMAnalysisResponse)
def get_or_create_ai_analysis(
    application_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Retrieves existing AI deep analysis for an application, or synthesizes one
    if not yet generated.
    """
    cached = get_cached_ai_analysis(db=db, application_id=application_id)
    if cached:
        return cached
        
    try:
        ip = request.client.host if request.client else None
        return perform_ai_deep_analysis(
            db=db,
            application_id=application_id,
            user=current_user,
            ip_address=ip
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating AI deep analysis: {str(e)}"
        )

@router.post("/{application_id}/regenerate", response_model=LLMAnalysisResponse)
def regenerate_ai_analysis(
    application_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Force re-runs the deep AI qualitative analysis engine for the candidate,
    updating the saved report and logging an audit event.
    """
    try:
        ip = request.client.host if request.client else None
        return perform_ai_deep_analysis(
            db=db,
            application_id=application_id,
            user=current_user,
            ip_address=ip
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error regenerating AI deep analysis: {str(e)}"
        )
