from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from .base import engine

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # 비동기 환경에서 세션 종료 후 객체 접근 에러 방지
)


# DB 세션 의존성 주입 함수
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            # await session.commit() # 성공 시 자동 커밋 (선택)
            # get_db에서는 세션만 생성(yield)하고,
            # 트랜잭션의 커밋/롤백은 각 서비스 함수 내에서 처리하는 것이 일반적
        except Exception:
            await session.rollback()
            raise
        # raise를 사용하여 발생한 예외를
        # FastAPI의 예외 처리 핸들러(예: 400, 500 에러)로 다시 던져줌
        finally:
            # 롤백/커밋 이후에 세션 종료 보장
            await session.close()


# async with 블록을 빠져나가면 session.close가 호출되어 커넥션 풀로 반환

Base = declarative_base()
