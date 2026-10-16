import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import httpx
from app.models import WebhookSubscription

logger = logging.getLogger(__name__)

def sign_payload(payload_str: str, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def dispatch_webhook_event(
    db: Session,
    event_type: str,
    data: Dict[str, Any]
):
    """
    Broadcasts signed webhook event payloads to all active subscribers.
    """
    subscriptions = db.query(WebhookSubscription).filter(
        WebhookSubscription.is_active == True
    ).all()

    payload = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    payload_str = json.dumps(payload, default=str)

    for sub in subscriptions:
        sub_events: List[str] = sub.event_types or []
        if event_type in sub_events or "*" in sub_events:
            signature = sign_payload(payload_str, sub.secret)
            headers = {
                "Content-Type": "application/json",
                "X-ATS-Signature": signature,
                "X-ATS-Event": event_type
            }
            try:
                # Dispatch non-blocking request with low timeout
                with httpx.Client(timeout=4.0) as client:
                    client.post(sub.url, content=payload_str, headers=headers)
            except Exception as e:
                logger.warning(f"Webhook delivery failed for {sub.url}: {str(e)}")
