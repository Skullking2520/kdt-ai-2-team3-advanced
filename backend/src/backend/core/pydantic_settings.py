from dotenv import find_dotenv
from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# 환경변수 읽어오는 설정
class Settings(BaseSettings):
    APP_ENV: str = Field(default=...)  # 개발/운영 환경
    # 1. 개별 MySQL 설정 (기본값이 없으므로 .env에 없으면 서버 구동 시 즉시 에러)
    MYSQL_ROOT_PASSWORD: str = Field(default=...)
    MYSQL_DATABASE: str = Field(default=...)
    MYSQL_USER: str = Field(default=...)
    MYSQL_PASSWORD: str = Field(default=...)

    # 2. SQLAlchemy용 DATABASE_URL 설정
    # AnyUrl 타입을 사용하면 유효한 URL 형식인지 Pydantic이 자동 검증합니다.
    DATABASE_URL: AnyUrl = Field(default=...)
    # Field(default=...)를 사용하면 Pylance가 인수가 누락되었다고 경고하지 않습니다.

    # 3. 기존 os.getenv("DATABASE_URL", "기본값") 처럼 대체값 지정하는 방법
    # 만약 .env에 필수값으로 두지 않고 기본값을 주려면 아래처럼 선언합니다.
    # SQLALCHEMY_DATABASE_URL: str = "sqlite:///./test.db"

    # csrf 비밀키 설정
    CSRF_SECRET: str = Field(default="your_csrf_key")

    # .env 파일 로드 설정 (pydantic v2 방식)
    model_config = SettingsConfigDict(
        env_file=find_dotenv(),  # 루트 .env까지 찾아 올라감
        env_file_encoding="utf-8",
        extra="ignore",  # .env에 다른 변수가 더 있어도 에러 내지 않고 무시
    )


# 전역 설정 객체 생성
settings = Settings()

print("환경 변수 로드 완료")  # 확인용, TODO: 로거로 교체
