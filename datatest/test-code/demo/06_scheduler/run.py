"""데모 06 — APScheduler 자동화 스케줄러

스케줄 (KST):
    00:00  URL 크롤링   — OpenPhish + URLhaus → MySQL blacklist
    00:15  웹 크롤링   — Playwright / 한국 게시판 5개 → S3 CSV
    00:30  S3 수동 입력 — manual_input/*.txt 감시 → blacklist INSERT
    02:00  VT 자동 스캔 — blacklist 미처리 항목 최대 400건 VirusTotal 조회

수동 URL 추가 방법:
    1) CLI : uv run python -c "from pipeline.crawler import insert_from_file; insert_from_file('urls.txt')"
    2) S3  : s3://smishing-s3-bucket/manual_input/urls_YYYYMMDD.txt 업로드
             → 00:30 스케줄러가 자동 감지 후 처리

실행:
    cd /path/to/test-code
    uv run python demo/06_scheduler/run.py

종료: Ctrl+C
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.scheduler import main as scheduler_main


def main():
    print("=" * 60)
    print("데모 06 — 자동화 스케줄러 (APScheduler)")
    print("=" * 60)
    print()
    print("등록된 스케줄 (KST):")
    print("  00:00  URL 크롤링    (OpenPhish + URLhaus → blacklist)")
    print("  00:15  웹 크롤링    (Playwright / 게시판 5개 → S3)")
    print("  00:30  S3 수동 입력  (manual_input/*.txt → blacklist)")
    print("  02:00  VT 자동 스캔  (최대 400건, 분당 4회 throttle)")
    print()
    print("Ctrl+C 로 종료")
    print("─" * 60)
    print()

    scheduler_main()


if __name__ == "__main__":
    main()
