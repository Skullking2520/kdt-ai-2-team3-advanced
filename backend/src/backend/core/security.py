import secrets
from typing import Annotated

from fastapi import Header, HTTPException, status

from .pydantic_settings import settings


async def require_admin_api_key(
    x_admin_api_key: Annotated[
        str | None,
        Header(alias="X-Admin-API-Key"),
    ] = None,
) -> None:
    configured_key = settings.ADMIN_API_KEY
    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin API is not configured",
        )
    if x_admin_api_key is None or not secrets.compare_digest(
        x_admin_api_key,
        configured_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin API key",
        )
