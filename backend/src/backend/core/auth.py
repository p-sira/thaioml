import os
from typing import List, Annotated
import jwt
from jwt import PyJWKClient
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# The frontend API's JWKS endpoint
# E.g., https://clerk.yourdomain.com/.well-known/jwks.json
# or for development: https://clerk.merry-camel-123.clerk.accounts.dev/.well-known/jwks.json
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL") 
jwks_client = PyJWKClient(CLERK_JWKS_URL, cache_keys=True) if CLERK_JWKS_URL else None

def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    """
    Validates the Bearer token using Clerk's JWKS and returns the claims payload.
    """
    if not jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_JWKS_URL is not set in environment variables"
        )
    
    token = credentials.credentials
    
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False} # Set to True if we enforce audience
        )
        return data
    except jwt.exceptions.PyJWKClientError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"JWKS Error: {str(error)}")
    except jwt.exceptions.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.exceptions.DecodeError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Decode Error: {str(error)}")
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))

def require_role(allowed_roles: List[str]):
    """
    FastAPI dependency that enforces the current user has at least one of the allowed roles.
    Checks Clerk's `org_role` or custom `roles` array in the JWT claims.
    """
    def role_checker(user_data: dict = Depends(get_current_user)):
        # Clerk typically sets org_role (e.g., "org:admin") for the active organization
        org_role = user_data.get("org_role")
        
        # Users might also use public_metadata for custom roles
        public_metadata = user_data.get("public_metadata", {})
        custom_roles = public_metadata.get("roles", [])
        
        all_user_roles = [org_role] if org_role else []
        if isinstance(custom_roles, list):
            all_user_roles.extend(custom_roles)
            
        if not any(role in allowed_roles for role in all_user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User does not have one of the required roles: {allowed_roles}"
            )
        return user_data
    return role_checker
