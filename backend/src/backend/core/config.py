from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette_csrf.middleware import CSRFMiddleware

from ..api import predict, root
from ..db import is_dev
from .pydantic_settings import settings  # 환경변수 로드


def configure_app(app: FastAPI):
    # cors 설정 추가
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # TODO: 우리 도메인 추가
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

    # 라우터 일괄등록
    app.include_router(root.router)
    app.include_router(predict.router)
