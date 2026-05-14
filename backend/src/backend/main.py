# src/backend/main.py
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from .core.config import configure_app, limiter
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


app = FastAPI(
    lifespan=lifespan,
    exception_handlers=exception_handlers,
    dependencies=[Depends(limiter.limit("15/minute"))],
    # 전역 api 리밋 제한, 예: 분당 15회 제한
)

configure_app(app)  # 일괄적인 설정값 주입
