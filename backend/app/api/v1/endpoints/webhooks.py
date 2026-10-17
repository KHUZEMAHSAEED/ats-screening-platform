import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import require_hr_role
from app.models import WebhookSubscription, User
from app.schemas.webhook import WebhookCreate, WebhookResponse
from app.services.audit_service import log_audit_event
from app.services.webhook_service import is_safe_webhook_url

router = APIRouter()

@router.get("", response_model=List[WebhookResponse])
def list_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    return db.query(WebhookSubscription).order_by(WebhookSubscription.created_at.desc()).all()

@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
def create_webhook(
    hook_in: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    url_str = str(hook_in.url)
    if not is_safe_webhook_url(url_str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook destination URL: Cloud metadata addresses and unroutable endpoints are blocked."
        )

    secret = secrets.token_hex(24)
    webhook = WebhookSubscription(
        url=str(hook_in.url),
        secret=secret,
        event_types=hook_in.event_types,
        description=hook_in.description,
        is_active=True
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)

    log_audit_event(
        db=db,
        action="WEBHOOK_SUBSCRIBED",
        entity_type="webhook",
        entity_id=webhook.id,
        user=current_user,
        details={"url": webhook.url, "events": webhook.event_types}
    )

    return webhook

@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_role)
):
    webhook = db.query(WebhookSubscription).filter(WebhookSubscription.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook subscription not found.")

    db.delete(webhook)
    db.commit()

    log_audit_event(
        db=db,
        action="WEBHOOK_DELETED",
        entity_type="webhook",
        entity_id=webhook_id,
        user=current_user
    )
    return None
