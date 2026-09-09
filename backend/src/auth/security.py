"""Password hashing and JWT issuing/verification.

Uses the passlib/bcrypt/python-jose dependencies already declared in
pyproject.toml, and the JWT settings already defined in src/config.py
(api_secret_key, api_algorithm, api_access_token_expire_minutes).
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from src.config import get_settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password for storage."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored hash."""
    try:
        return _pwd_context.verify(plain_password, password_hash)
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
