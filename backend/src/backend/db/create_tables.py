from .base import Base, engine


def create_db_tables():
    print("테이블 생성을 시작합니다...")
    # Base에 등록된 모든 테이블 생성
    # Base.metadata.drop_all(bind=engine)는 삭제이나 운영 환경 비권장
    Base.metadata.create_all(bind=engine)
    print("테이블 생성 완료!")
