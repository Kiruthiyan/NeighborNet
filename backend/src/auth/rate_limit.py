"""Minimal in-memory rate limiter for auth endpoints prone to brute force
(login, OTP verification/issuance, password reset).

Single-process only, matching this codebase's existing in-memory-first demo
architecture (see CoordinationService) - swap for a shared store (DynamoDB,
Redis) before running multiple backend instances behind a load balancer.
Without this, a 6-digit OTP with no throttling is brute-forceable well
within its 10-minute expiry window.
"""

import time
from collections import defaultdict
from typing import Dict, List

from fastapi import HTTPException, status

from src.config import get_settings

_attempts: Dict[str, List[float]] = defaultdict(list)


def enforce_rate_limit(key: str, max_attempts: int, window_seconds: int) -> None:
    """Raise 429 if `key` has already made `max_attempts` calls within the
    last `window_seconds`; otherwise records this attempt.

    No-op in the test environment: the test suite legitimately logs in as
    the same seeded admin dozens of times per run (once per test fixture) -
    that's fixture setup, not the credential-stuffing pattern this guards
    against in a real deployment."""

    if get_settings().environment == "test":
        return

    now = time.monotonic()
    window_start = now - window_seconds
    attempts = [t for t in _attempts[key] if t > window_start]
    attempts.append(now)
    _attempts[key] = attempts
    if len(attempts) > max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please wait a few minutes before trying again.",
        )
