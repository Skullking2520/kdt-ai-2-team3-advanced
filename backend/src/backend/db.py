import os

from dotenv import load_dotenv
from sqlalchemy import Column, Float, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()  # .env파일 로드
# 1. DB 연결 설정 (PyMySQL 드라이버 사용)
# 형식: mysql+pymysql://유저명:비밀번호@호스트:포트/DB명
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "없으면 오류 남")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# DB 세션 의존성 주입 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 2. DB 모델 정의 (예: 추론 결과 저장용)
class InferenceLog(Base):
    __tablename__ = "inference_logs"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50))
    prediction = Column(Float)


# 테이블 생성
Base.metadata.create_all(bind=engine)
