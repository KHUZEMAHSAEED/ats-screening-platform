from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, require_hr_role
from app.models import JobApplication, CandidateNote, User
from app.schemas.decision import CandidateNoteCreate, CandidateNoteResponse
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/{application_id}/notes", response_model=CandidateNoteResponse)
def add_candidate_note(
    application_id: str,
    note_in: CandidateNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found.")

    if not note_in.content or len(note_in.content.strip()) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Note content cannot be empty.")

    note = CandidateNote(
        application_id=app.id,
        user_id=current_user.id,
        content=note_in.content.strip()
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit_event(
        db=db,
        action="CANDIDATE_NOTE_ADDED",
        entity_type="candidate_note",
        entity_id=note.id,
        user=current_user,
        application_id=app.id
    )

    return CandidateNoteResponse(
        id=note.id,
        application_id=note.application_id,
        user_id=note.user_id,
        author_name=current_user.full_name,
        content=note.content,
        created_at=note.created_at
    )

@router.get("/{application_id}/notes", response_model=List[CandidateNoteResponse])
def get_candidate_notes(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notes = db.query(CandidateNote).filter(
        CandidateNote.application_id == application_id
    ).order_by(CandidateNote.created_at.desc()).all()

    return [
        CandidateNoteResponse(
            id=n.id,
            application_id=n.application_id,
            user_id=n.user_id,
            author_name=n.author.full_name if n.author else None,
            content=n.content,
            created_at=n.created_at
        )
        for n in notes
    ]
