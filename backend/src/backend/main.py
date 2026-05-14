# src/backend/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette_csrf.middleware import CSRFMiddleware

from .api import endpoints, predict
from .core.config import settings  # 환경변수 로드
from .db import is_dev
from .db.create_tables import create_db_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버가 시작될 때 테이블 생성
    await create_db_tables()
    yield  # 제어권 넘기는 제너레이터
    # 서버가 종료될 때 실행할 코드가 있다면 여기에 작성


app = FastAPI(lifespan=lifespan)

app.include_router(endpoints.router)
app.include_router(predict.router)

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


@app.get("/")
def read_root():  # await할게 없으면 async하지 않는다.
    return {"message": "Hello!"}
