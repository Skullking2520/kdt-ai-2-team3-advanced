# src/backend/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .core.config import configure_app
from .db.create_tables import create_db_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버가 시작될 때 테이블 생성
    await create_db_tables()
    yield  # 제어권 넘기는 제너레이터
    # 서버가 종료될 때 실행할 코드가 있다면 여기에 작성


app = FastAPI(lifespan=lifespan)

configure_app(app)  # 일괄적인 설정값 주입
