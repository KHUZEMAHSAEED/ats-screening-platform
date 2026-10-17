from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import User
from app.schemas.calibration import (
    JobCalibrationAnalysisResponse,
    ApplyCalibratedWeightsRequest,
    ApplyCalibratedWeightsResponse
)
from app.services.calibration_service import (
    analyze_job_calibration,
    apply_calibrated_weights
)

router = APIRouter()

@router.get("/{job_id}", response_model=JobCalibrationAnalysisResponse)
def get_job_calibration_analytics(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Computes active learning criteria weights, human-machine alignment rates,
    and reviewer calibration metrics based on historical HR decisions.
    """
    try:
        return analyze_job_calibration(db=db, job_id=job_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing calibration metrics: {str(e)}"
        )

@router.post("/{job_id}/apply", response_model=ApplyCalibratedWeightsResponse)
def apply_job_calibrated_weights(
    job_id: str,
    req: ApplyCalibratedWeightsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    """
    Applies the active learning calibrated weights to the job's screening criteria,
    recording an immutable audit event and optionally re-evaluating all candidates.
    """
    try:
        return apply_calibrated_weights(
            db=db,
            job_id=job_id,
            reevaluate=req.reevaluate_candidates,
            user=current_user
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error applying calibrated weights: {str(e)}"
        )
