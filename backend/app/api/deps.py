"""Reusable FastAPI dependencies (auth/authorization)."""

from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core import security
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolve the authenticated user from the bearer token.

    A token whose subject no longer resolves to an active account is an
    authentication failure (401), not a missing resource. Checking ``is_active``
    here — and not only at login — means deactivating an account takes effect
    immediately instead of when the account's existing token happens to expire.
    """
    email = security.verify_token(credentials.credentials)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Resolve the authenticated user if a valid bearer token is supplied,
    otherwise return ``None``.

    Used by endpoints that work both logged-in and anonymously (e.g. the
    kiosk attendance flow): when a user is logged in we can restrict the
    action to that account, but the endpoint still functions without auth.
    """
    if credentials is None:
        return None
    try:
        email = security.verify_token(credentials.credentials)
    except Exception:
        return None
    user = db.query(User).filter(User.email == email).first()
    # A deactivated account is treated as unauthenticated rather than granted
    # the identity-locked path, so it cannot be used to assert an identity.
    if user is not None and not user.is_active:
        return None
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to have the admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
