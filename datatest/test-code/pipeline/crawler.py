"""스미싱/피싱 URL 크롤러.

수집 소스:
    - OpenPhish : https://openphish.com/feed.txt (무료 피드)
    - URLhaus   : https://urlhaus-api.abuse.ch/v1/urls/recent/ (무료 API)

수집된 URL은 MySQL blacklist 테이블에 INSERT IGNORE로 저장.

실행:
    uv run python -m pipeline.crawler
"""

import hashlib
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import requests

from .mysql_io import get_conn
from .logger import log_info, log_error, log_warning

KST = ZoneInfo("Asia/Seoul")

# ─────────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────────

OPENPHISH_FEED_URL = "https://openphish.com/feed.txt"
URLHAUS_API_URL = "https://urlhaus-api.abuse.ch/v1/urls/recent/"
REQUEST_TIMEOUT = 10


# ─────────────────────────────────────────────────
# blacklist INSERT
# ─────────────────────────────────────────────────

def insert_blacklist_urls(urls: list[dict]) -> tuple[int, int]:
    """URL 목록을 blacklist 테이블에 INSERT IGNORE.

    Args:
        urls: [{"pattern_value": ..., "source": ..., "category": ...}, ...]

    Returns:
        (삽입 성공 건수, 중복 스킵 건수)
    """
    sql = """
        INSERT IGNORE INTO blacklist
            (pattern_type, pattern_value, pattern_hash, category, source, severity)
        VALUES
            ('url', %(pattern_value)s, %(pattern_hash)s,
             %(category)s, %(source)s, 'high')
    """
    inserted = 0
    skipped = 0

    with get_conn() as conn, conn.cursor() as cur:
        for url in urls:
            url["pattern_hash"] = hashlib.sha256(
                url["pattern_value"].encode()
            ).hexdigest()
            cur.execute(sql, url)
            if cur.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

    return inserted, skipped


# ─────────────────────────────────────────────────
# OpenPhish
# ─────────────────────────────────────────────────

def crawl_openphish() -> list[dict]:
    """OpenPhish 무료 피드에서 피싱 URL 수집.

    Returns:
        blacklist INSERT용 dict 리스트
    """
    log_info("crawler", "crawl_openphish", "OpenPhish 크롤링 시작")

    try:
        response = requests.get(OPENPHISH_FEED_URL, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        log_error("crawler", "crawl_openphish", f"요청 실패: {e}", exc=e)
        return []

    urls = []
    for line in response.text.strip().split("\n"):
        line = line.strip()
        if line and line.startswith("http"):
            urls.append({
                "pattern_value": line,
                "source": "openphish",
                "category": "피싱",
            })

    log_info("crawler", "crawl_openphish", f"수집 완료: {len(urls)}건")
    return urls


# ─────────────────────────────────────────────────
# URLhaus
# ─────────────────────────────────────────────────

def crawl_urlhaus(limit: int = 1000) -> list[dict]:
    """URLhaus API에서 최근 악성 URL 수집.

    Args:
        limit: 최대 수집 건수 (기본 1000)

    Returns:
        blacklist INSERT용 dict 리스트
    """
    log_info("crawler", "crawl_urlhaus", "URLhaus 크롤링 시작")

    try:
        response = requests.get(URLHAUS_API_URL, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        log_error("crawler", "crawl_urlhaus", f"요청 실패: {e}", exc=e)
        return []
    except Exception as e:
        log_error("crawler", "crawl_urlhaus", f"JSON 파싱 실패: {e}", exc=e)
        return []

    if data.get("query_status") != "ok":
        log_warning("crawler", "crawl_urlhaus", f"API 응답 오류: {data.get('query_status')}")
        return []

    urls = []
    for item in data.get("urls", [])[:limit]:
        url = item.get("url")
        if not url:
            continue

        # URLhaus 태그로 카테고리 판별
        tags = item.get("tags") or []
        if any(t in ["malware", "malware_download"] for t in tags):
            category = "악성앱"
        elif any(t in ["phishing"] for t in tags):
            category = "피싱"
        else:
            category = "악성코드"

        urls.append({
            "pattern_value": url,
            "source": "urlhaus",
            "category": category,
        })

    log_info("crawler", "crawl_urlhaus", f"수집 완료: {len(urls)}건")
    return urls


# ─────────────────────────────────────────────────
# 수동 입력
# ─────────────────────────────────────────────────

def insert_from_file(filepath: str, category: str = "피싱") -> tuple[int, int]:
    """텍스트 파일에서 URL 읽어서 blacklist INSERT.

    파일 형식: 한 줄에 URL 하나 (http로 시작하는 줄만 처리)

    Args:
        filepath: URL 목록 텍스트 파일 경로
        category: 카테고리 (기본: 피싱)

    Returns:
        (삽입 성공 건수, 중복 스킵 건수)
    """
    log_info("crawler", "insert_from_file", f"파일 읽기 시작: {filepath}")

    with open(filepath, encoding="utf-8") as f:
        urls = [
            {
                "pattern_value": line.strip(),
                "source": "manual",
                "category": category,
            }
            for line in f
            if line.strip().startswith("http")
        ]

    if not urls:
        log_warning("crawler", "insert_from_file", "처리할 URL 없음")
        return 0, 0

    ins, skip = insert_blacklist_urls(urls)
    log_info("crawler", "insert_from_file",
             f"완료: 신규 {ins}건 / 중복 {skip}건")
    return ins, skip


# ─────────────────────────────────────────────────
# 통합 실행
# ─────────────────────────────────────────────────

def run_all_crawlers() -> dict:
    """모든 크롤러 실행 + blacklist 저장.

    Returns:
        {
            "openphish": {"collected": N, "inserted": N, "skipped": N},
            "urlhaus":   {"collected": N, "inserted": N, "skipped": N},
        }
    """
    log_info("crawler", "run_all_crawlers", "전체 크롤링 시작")
    result = {}

    # OpenPhish
    openphish_urls = crawl_openphish()
    if openphish_urls:
        ins, skip = insert_blacklist_urls(openphish_urls)
        result["openphish"] = {
            "collected": len(openphish_urls),
            "inserted": ins,
            "skipped": skip,
        }
        log_info("crawler", "run_all_crawlers",
                 f"OpenPhish → 수집 {len(openphish_urls)}건 / 신규 {ins}건 / 중복 {skip}건")

    # URLhaus
    urlhaus_urls = crawl_urlhaus()
    if urlhaus_urls:
        ins, skip = insert_blacklist_urls(urlhaus_urls)
        result["urlhaus"] = {
            "collected": len(urlhaus_urls),
            "inserted": ins,
            "skipped": skip,
        }
        log_info("crawler", "run_all_crawlers",
                 f"URLhaus → 수집 {len(urlhaus_urls)}건 / 신규 {ins}건 / 중복 {skip}건")

    log_info("crawler", "run_all_crawlers", "전체 크롤링 완료")
    return result


# ─────────────────────────────────────────────────
# 단독 실행
# ─────────────────────────────────────────────────

def main() -> None:
    print("=" * 50)
    print("스미싱 URL 크롤러")
    print("=" * 50)

    result = run_all_crawlers()

    print("\n결과:")
    for source, stats in result.items():
        print(f"  {source}: 수집 {stats['collected']}건 / "
              f"신규 {stats['inserted']}건 / 중복 {stats['skipped']}건")


if __name__ == "__main__":
    main()