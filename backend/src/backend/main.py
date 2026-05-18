# src/backend/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .core.config import apply_cors_middleware, configure_app
from .core.exceptions import exception_handlers
from .db.create_tables import create_db_tables


# lifespan: 애플리케이션이 시작될 때와 종료될 때 실행되어야
# 하는 로직(DB 연결, 모델 로드, 캐시 초기화 등)을 정의
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버가 시작될 때 테이블 생성
    await create_db_tables()
    yield  # 제어권 넘기는 제너레이터, 앱 시작 / 종료 실행 로직 나누는 곳
    # 서버가 종료될 때 실행할 코드가 있다면 여기에 작성


fastapi_app = FastAPI(lifespan=lifespan, exception_handlers=exception_handlers)

configure_app(fastapi_app)  # 일괄적인 설정값 주입

# CORS를 앱 전체의 가장 바깥에 둬서 검증/CSRF/서버 에러 응답에도 헤더가 붙게 한다.
app = apply_cors_middleware(fastapi_app)
