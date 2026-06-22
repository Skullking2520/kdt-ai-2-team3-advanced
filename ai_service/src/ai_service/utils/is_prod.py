from ..config.settings import settings

# settings 파일이나 환경 변수에서 프로덕션 여부 판단 (기본값 False)
APP_ENV = getattr(settings, "APP_ENV", "development")
is_prod = APP_ENV == "production"