"""Password hashing and JWT issuing/verification.

Uses the passlib/bcrypt/python-jose dependencies already declared in
pyproject.toml, and the JWT settings already defined in src/config.py
(api_secret_key, api_algorithm, api_access_token_expire_minutes).
"""

import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config import get_settings

import bcrypt

OTP_TTL_MINUTES = 10


def generate_otp() -> str:
    """A 6-digit numeric one-time code, e.g. for email verification or
    password reset. Hashed the same way as a password before storage - see
    hash_password/verify_password below."""
    return f"{secrets.randbelow(1_000_000):06d}"


def otp_expiry() -> datetime:
    # Matches datetime.now() used elsewhere in the models (e.g. Invitation.expires_at) -
    # naive local time throughout, not UTC, so comparisons stay consistent.
    return datetime.now() + timedelta(minutes=OTP_TTL_MINUTES)


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password for storage."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = password_hash.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    """Issue a signed JWT for the given user_id (the `sub` claim)."""
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=settings.api_access_token_expire_minutes)
    payload: Dict[str, Any] = {"sub": subject, "exp": expire}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.api_secret_key, algorithm=settings.api_algorithm)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT, returning its claims or None if invalid/expired."""
    settings = get_settings()
    try:
        return jwt.decode(token, settings.api_secret_key, algorithms=[settings.api_algorithm])
    except JWTError:
        return None
