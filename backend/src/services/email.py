"""Outbound email via Gmail SMTP + App Password.

Disabled by default (no SMTP_USERNAME/SMTP_PASSWORD configured) so local dev
and the test suite never try to hit the network - mirrors the
PERSIST_TO_DYNAMODB toggle pattern in dynamo_store.py. When disabled, callers
should fall back to a copy/paste link (see api/admin.py's invitation flow).
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

import structlog

from src.config import get_settings

logger = structlog.get_logger(__name__)


def is_email_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_username and settings.smtp_password)


def send_email(to_email: str, subject: str, body_text: str) -> bool:
    """Send a plaintext email. Returns True if sent, False if skipped/failed
    (never raises - callers treat email as best-effort, not a hard dependency
    for the underlying action, e.g. creating an invitation, to succeed)."""

    settings = get_settings()
    if not is_email_configured():
        logger.info("email_skipped_not_configured", to=to_email, subject=subject)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_username}>"
    message["To"] = to_email
    message.set_content(body_text)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        logger.info("email_sent", to=to_email, subject=subject)
        return True
    except Exception as exc:  # pragma: no cover - depends on live SMTP
        logger.warning("email_send_failed", to=to_email, subject=subject, error=str(exc))
        return False


def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """purpose is 'verify_email' or 'reset_password' - only the subject/body
    wording differs."""

    if purpose == "reset_password":
        subject = "Your NeighborNet password reset code"
        intro = "Use this code to reset your NeighborNet password:"
    else:
        subject = "Verify your NeighborNet email"
        intro = "Use this code to verify your NeighborNet email address:"

    body = (
        f"{intro}\n\n"
        f"    {otp}\n\n"
        f"This code expires in 10 minutes. If you didn't request this, you can ignore this email."
    )
    return send_email(to_email, subject, body)


def send_invitation_email(to_email: str, signup_url: str, inviter_name: str) -> bool:
    subject = "You're invited to NeighborNet"
    body = (
        f"{inviter_name} invited you to join NeighborNet, a community resource "
        f"coordination platform.\n\n"
        f"Sign up here: {signup_url}\n\n"
        f"This link is unique to your invitation - don't share it."
    )
    return send_email(to_email, subject, body)
