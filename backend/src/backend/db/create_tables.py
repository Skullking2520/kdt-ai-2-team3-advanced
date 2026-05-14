from .base import Base, engine


async def create_db_tables():
    async with engine.begin() as conn:
        print("테이블 생성을 시작합니다...")
        # Base에 등록된 모든 테이블 생성
        # 동기 메서드인 create_all을 비동기 커넥션 위에서 생성
        await conn.run_sync(Base.metadata.create_all)
        print("테이블 생성 완료!")
