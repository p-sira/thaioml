import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

security = HTTPBearer()

from backend.core.config import settings

# The frontend API's JWKS endpoint
# E.g., https://clerk.yourdomain.com/.well-known/jwks.json
# or for development: https://clerk.merry-camel-123.clerk.accounts.dev/.well-known/jwks.json
CLERK_JWKS_URL = settings.clerk_jwks_url or os.environ.get("CLERK_JWKS_URL")
jwks_client = PyJWKClient(CLERK_JWKS_URL, cache_keys=True) if CLERK_JWKS_URL else None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
):
    """
    Validates the Bearer token using Clerk's JWKS and returns the claims payload.
    """
    if not jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL is not set in environment variables",
        )

    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Set to True if we enforce audience
        )
        return data
    except jwt.exceptions.PyJWKClientError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"JWKS Error: {error!s}"
        )
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
        )
    except jwt.exceptions.DecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Decode Error: {error!s}",
        )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))


def require_role(allowed_roles: list[str]):
    """
    FastAPI dependency that enforces the current user has at least one of the allowed roles.
    Checks Clerk's `org_role` or custom `roles` array in the JWT claims.
    """

    def role_checker(user_data: Annotated[dict, Depends(get_current_user)]):
        # Clerk typically sets org_role (e.g., "org:admin") for the active organization
        org_role = user_data.get("org_role")

        # Check both snake_case and camelCase for public metadata
        public_metadata = user_data.get("public_metadata", {}) or user_data.get(
            "publicMetadata", {}
        )
        custom_roles = public_metadata.get("roles", [])

        # Sometimes custom claims are placed at the root level of the JWT
        if not custom_roles:
            custom_roles = user_data.get("roles", [])

        all_user_roles = [org_role] if org_role else []
        if isinstance(custom_roles, list):
            all_user_roles.extend(custom_roles)
        elif isinstance(custom_roles, str):
            all_user_roles.append(custom_roles)

        if not any(role in allowed_roles for role in all_user_roles):
            print(f"DEBUG: JWT Payload rejected: {user_data}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Your roles ({all_user_roles}) do not match any of the required roles: {allowed_roles}. Please check your JWT payload.",
            )
        return user_data

    return role_checker
