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

from .core.config import CORS_OPTIONS, configure_app
from .core.exceptions import exception_handlers
from .db.create_tables import create_db_tables


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_tables()
    await _warmup_ocr()
    vt_task = asyncio.create_task(_start_vt_worker())
    yield
    vt_task.cancel()
    try:
        await vt_task
    except asyncio.CancelledError:
        pass


async def _warmup_ocr() -> None:
    from .core.pydantic_settings import settings
    if settings.USE_MOCK_OCR:
        return
    try:
        from .ocr.ocr_service import _get_paddle_ocr
        await asyncio.get_event_loop().run_in_executor(None, _get_paddle_ocr)
        logger.info("[startup] PaddleOCR 워밍업 완료")
    except Exception as e:
        logger.warning("[startup] PaddleOCR 워밍업 실패 (첫 요청이 느릴 수 있음): %s", e)


async def _start_vt_worker() -> None:
    from .core.pydantic_settings import settings
    if not settings.VIRUSTOTAL_API_KEY:
        logger.warning("[startup] VIRUSTOTAL_API_KEY 없음 - VT 워커 비활성화")
        return
    try:
        from .workers.virustotal_worker import serve
        logger.info("[startup] VT 워커 시작")
        await serve()
    except Exception as e:
        logger.error("[startup] VT 워커 오류: %s", e)


app = FastAPI(lifespan=lifespan, exception_handlers=exception_handlers)

configure_app(app)  # 일괄적인 설정값 주입

# CORS를 앱 전체의 가장 바깥에 둬서 검증/서버 에러 응답에도 헤더가 붙게 한다.
app.add_middleware(CORSMiddleware, **CORS_OPTIONS)
