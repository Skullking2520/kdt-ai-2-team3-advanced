from sqlalchemy.orm import sessionmaker

from .base import engine

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# DB 세션 의존성 주입 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
