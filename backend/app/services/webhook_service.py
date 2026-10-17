import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import httpx
from app.models import WebhookSubscription

from urllib.parse import urlparse
import ipaddress
from app.core.config import settings

logger = logging.getLogger(__name__)

BLOCKED_METADATA_HOSTS = {
    "169.254.169.254", "metadata.google.internal", "metadata", "instance-data"
}

def is_safe_webhook_url(url: str, allow_local: bool = None) -> bool:
    """
    Validates webhook URL against SSRF (Server-Side Request Forgery) attacks,
    blocking cloud metadata endpoints (e.g. AWS IMDS, GCP metadata) and loopback/private IPs in production.
    """
    if allow_local is None:
        allow_local = settings.ENVIRONMENT.lower() != "production"

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        # Strict block on cloud metadata services
        if hostname in BLOCKED_METADATA_HOSTS:
            return False
        if not allow_local:
            if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
                return False
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    return False
            except ValueError:
                pass
        return True
    except Exception:
        return False

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
        if not is_safe_webhook_url(sub.url):
            logger.warning(f"Skipping delivery to unsafe/metadata webhook URL: {sub.url}")
            continue

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
