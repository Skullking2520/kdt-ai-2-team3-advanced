from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette_csrf.middleware import CSRFMiddleware

from ..api import predict, root
from ..db import is_dev
from .pydantic_settings import settings  # 환경 변수 로드

limiter = Limiter(key_func=get_remote_address, default_limits=["15/minutes"])
# get_remote_address: Returns the ip address for the current request


def configure_app(app: FastAPI):
    # cors 설정 추가
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "https://smishing-detect-kdt2.cloud"],
        allow_credentials=True,  # 쿠키 공유 허용
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # csrf 설정 추가
    app.add_middleware(
        CSRFMiddleware,
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
