from sqlalchemy import create_engine

# models 폴더에 모은 모든 모델에 대해 테이블을 생성한다.
from sqlalchemy.ext.declarative import declarative_base

# 환경변수를 로드한다.
from ..core.config import settings

# 1. DB 연결 설정 (PyMySQL 드라이버 사용)
# 형식: mysql+pymysql://유저명:비밀번호@호스트:포트/DB명
SQLALCHEMY_DATABASE_URL = str(settings.DATABASE_URL)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

Base = declarative_base()
