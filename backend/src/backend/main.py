# src/backend/main.py
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s - %(message)s",
)

# uvicorn.error 로그가 상위 로거로 전달되어 중복 출력되는 것을 방지
# uvicorn.error: 서버의 라이프사이클(시작, 재시작, 종료) 및 실제 코드 내 발생한 에러 기록하는 기본 로거
logging.getLogger("uvicorn.error").propagate = False
logging.getLogger("uvicorn.access").propagate = False

from .core.config import CORS_OPTIONS, configure_app
from .core.exceptions import exception_handlers
from .db.create_tables import create_db_tables

# lifespan: 애플리케이션이 시작될 때와 종료될 때 실행되어야
# 하는 로직(DB 연결, 모델 로드, 캐시 초기화 등)을 정의

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_tables()
    await _warmup_ocr()
    # VT 워커는 별도 url-validator 컨테이너에서 단독 실행한다.
    # (API 재시작과 무관하게 동작 + 이중 실행 방지)
    yield


async def _warmup_ocr() -> None:
    from .core.pydantic_settings import settings
    if settings.USE_MOCK_OCR:
        return
    if settings.USE_CLOVA_ONLY and settings.CLOVA_OCR_URL and settings.CLOVA_OCR_SECRET:
        logger.info("[startup] CLOVA 전용 모드 — PaddleOCR 워밍업 스킵")
        return
    try:
        from .ocr.ocr_service import _get_paddle_ocr
        await asyncio.get_event_loop().run_in_executor(None, _get_paddle_ocr)
        # 첫 번째 인자가 None이면 파이썬의 기본 스레드 풀(ThreadPoolExecutor)을 사용합니다.        
        # 두 번째 인자인 _get_paddle_ocr 함수를 별도의 스레드(백그라운드)에서 실행하도록 넘깁니다.
        logger.info("[startup] PaddleOCR 워밍업 완료")
    except Exception as e:
        logger.warning("[startup] PaddleOCR 워밍업 실패 (첫 요청이 느릴 수 있음): %s", e)


app = FastAPI(lifespan=lifespan, exception_handlers=exception_handlers)

configure_app(app)  # 일괄적인 설정값 주입

# CORS를 앱 전체의 가장 바깥에 둬서 검증/서버 에러 응답에도 헤더가 붙게 한다.
app.add_middleware(CORSMiddleware, **CORS_OPTIONS)
