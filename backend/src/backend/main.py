# src/backend/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import endpoints, predict
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # TODO: 우리 도메인 추가
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():  # await할게 없으면 async하지 않는다.
    return {"message": "Hello!"}
