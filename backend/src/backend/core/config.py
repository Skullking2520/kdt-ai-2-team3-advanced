from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from ..api import predict, report, root
from ..db import is_dev
from .exceptions import JSONCSRFMiddleware
from .pydantic_settings import settings  # 환경 변수 로드

limiter = Limiter(key_func=get_remote_address, default_limits=["15/minutes"])
# get_remote_address: Returns the ip address for the current request

CORS_OPTIONS = {
    "allow_origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://smishing-detect-kdt2.cloud",
    ],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}


def apply_cors_middleware(app):
    return CORSMiddleware(app, **CORS_OPTIONS)


def configure_app(app: FastAPI):
    # Instrumentation 설정 및 /metrics 자동 등록, 최상단으로 등록해야함
    Instrumentator(
        should_group_status_codes=True,  # 2xx, 3xx, 4xx, 5xx 그룹화
        should_ignore_untemplated=True,  # 템플릿 없는 경로 무시 (/docs 등)
        excluded_handlers=["/health", "/metrics"],
    ).instrument(app).expose(app, include_in_schema=False)
    # expose(): GET /metrics 등록

    # csrf 설정 추가
    app.add_middleware(
        JSONCSRFMiddleware,
        secret=str(settings.CSRF_SECRET),
        cookie_secure=not is_dev,  # http 개발환경 비암호화
        cookie_samesite="lax",  # cross-origin 전송용
    )

    # rate limiting 설정 추가
    app.state.limiter = limiter
    app.add_exception_handler(
        RateLimitExceeded,
        _rate_limit_exceeded_handler,  # type: ignore
    )
    app.add_middleware(SlowAPIMiddleware)

    # 라우터 일괄등록
    app.include_router(root.router)
    app.include_router(predict.router)
    app.include_router(report.router)
