from sqlalchemy.ext.asyncio import create_async_engine

# models 폴더에 모은 모든 모델에 대해 테이블을 생성한다.
from sqlalchemy.ext.declarative import declarative_base

from ..core.pydantic_settings import settings  # 환경변수 로드
from . import is_dev

# 1. DB 연결 설정 (asyncmy 드라이버 사용)
# 형식: mysql+asyncmy://유저명:비밀번호@호스트:포트/DB명
SQLALCHEMY_DATABASE_URL = str(settings.DATABASE_URL)

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=20,  # 기본 풀 커넥션 크기
    max_overflow=10,  # 최대 초과 허용 커넥션 개수
    pool_timeout=30,  # 커넥션 획득 대기시간
    pool_recycle=3600,  # 커넥션 재사용 생명 주기(초)
    pool_pre_ping=True,  # 연결 유효성 검사: select 1
    echo=is_dev,  # 디버깅모드시 sql 쿼리 출력
)
# 총 필요한 db 커넥션 개수 = (pool_size + max_overflow) * gunicorn worker수
# cloud db for mysql이 151개 이상이라고 하고, 공식은 120개가 나옴.

Base = declarative_base()
