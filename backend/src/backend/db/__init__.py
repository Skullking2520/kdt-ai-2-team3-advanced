from ..core.pydantic_settings import settings  # 환경변수 로드

APP_ENV = str(settings.APP_ENV)

if APP_ENV == "development":
    is_dev = True
else:
    is_dev = False
