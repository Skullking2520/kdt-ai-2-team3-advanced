import asyncio
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..core.pydantic_settings import settings
from ..services.virustotal_service import process_pending_url_candidates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_once() -> None:
    try:
        result = await process_pending_url_candidates()
        logger.info(
            "VirusTotal URL candidate validation completed: %s",
            result,
        )
    except Exception:
        logger.exception("VirusTotal URL candidate validation failed")


async def serve() -> None:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_once,
        trigger="interval",
        minutes=settings.VT_WORKER_INTERVAL_MINUTES,
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now()
        + timedelta(seconds=settings.VT_WORKER_STARTUP_DELAY_SECONDS),
    )
    scheduler.start()
    logger.info(
        "VirusTotal worker started: interval=%sm",
        settings.VT_WORKER_INTERVAL_MINUTES,
    )

    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown()


def main() -> None:
    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        logger.info("VirusTotal worker stopped")


if __name__ == "__main__":
    main()
