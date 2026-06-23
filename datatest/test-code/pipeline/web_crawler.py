"""Playwright 기반 한국 스미싱·피싱 사례 게시판 크롤러.

수집 소스 및 확인된 구조:
    - sokjima  : https://sokjima.com/cases/
                 목록: a[href*='/cases/case/'] / 페이지: ?page=N
                 상세: h1 제목, main 본문
    - msafer   : https://www.msafer.or.kr/board_phishing/
                 목록: POST API /board_phishing/getPhishingList.do → JSON (url 필드 = 외부 뉴스)
                 상세: 외부 뉴스 URL을 Playwright로 방문
    - wiseuser : https://www.wiseuser.go.kr/edu_list.do?boardtypecode=5255
                 목록: table.notice_box tbody a (javascript:goEdit → form POST)
                 페이지: GET ?boardtypecode=5255&curpage=N
                 상세: #content-wrap
    - police   : https://cyberbureau.police.go.kr/board/boardList.do?board_id=warning&mid=020700
                 목록: a[href*='boardView.do'] / 페이지: ?board_id=warning&mid=020700&page=N
                 상세: .bbs_view_wrap (thead 제목/날짜), .bbs_cont (본문)
    - kisa     : https://www.boho.or.kr/kr/bbs/list.do?menuNo=205020&bbsId=B0000133
                 목록: a[href*='bbs/view.do'] / 페이지: ?pageIndex=N 추가
                 상세: .content_html (본문), .contents (제목+날짜 포함)

결과: S3 crawled/web/YYYY/MM/DD/daily.jsonl

실행:
    uv run python -m pipeline.web_crawler
"""

import re
import time
import requests as _requests
from datetime import datetime
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout

from .logger import log_info, log_error, log_warning
from .s3_io import put_jsonl

KST = ZoneInfo("Asia/Seoul")

# ─────────────────────────────────────────────────
# 상수
# ─────────────────────────────────────────────────

MAX_PAGES      = 3
MAX_ARTICLES   = 20
LOAD_TIMEOUT   = 20_000   # ms
REQ_DELAY      = 1.5      # 요청 간 대기 (초)

BASE_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


# ─────────────────────────────────────────────────
# 공통 유틸
# ─────────────────────────────────────────────────

def _text(page: Page, selector: str, default: str = "") -> str:
    try:
        el = page.query_selector(selector)
        return el.inner_text().strip() if el else default
    except Exception:
        return default


def _save_to_s3(records: list[dict]) -> str | None:
    if not records:
        return None
    now = datetime.now(KST)
    key = f"crawled/web/{now.year:04d}/{now.month:02d}/{now.day:02d}/daily.jsonl"
    try:
        path = put_jsonl(key, records)
        log_info("web_crawler", "_save_to_s3", f"S3 저장: {path} ({len(records)}건)")
        return path
    except Exception as e:
        log_error("web_crawler", "_save_to_s3", f"S3 저장 실패: {e}", exc=e)
        return None


def _record(source: str, url: str, title: str, date: str, content: str) -> dict:
    return {
        "source": source,
        "url": url,
        "title": title,
        "date": date,
        "content": content,
        "crawled_at": datetime.now(KST).isoformat(),
    }


# ─────────────────────────────────────────────────
# 1. sokjima
# ─────────────────────────────────────────────────

def _crawl_sokjima(page: Page) -> list[dict]:
    """sokjima.com/cases/ — 워드프레스 기반 사기 사례"""
    BASE = "https://sokjima.com"
    LIST = f"{BASE}/cases/"
    records: list[dict] = []

    try:
        page.goto(LIST, wait_until="domcontentloaded", timeout=LOAD_TIMEOUT)
        time.sleep(1)
    except PWTimeout:
        log_warning("web_crawler", "_crawl_sokjima", "목록 타임아웃")
        return records

    for page_num in range(1, MAX_PAGES + 1):
        # /cases/case/ 패턴 링크만 수집
        hrefs: list[str] = []
        seen: set[str] = set()
        for link in page.query_selector_all("a[href*='/cases/case/']"):
            href = link.get_attribute("href") or ""
            full = href if href.startswith("http") else f"{BASE}{href}"
            if full not in seen and full != LIST:
                hrefs.append(full)
                seen.add(full)
        hrefs = hrefs[:MAX_ARTICLES]

        for href in hrefs:
            try:
                page.goto(href, wait_until="domcontentloaded", timeout=LOAD_TIMEOUT)
                time.sleep(REQ_DELAY)

                title   = _text(page, "h1")
                content = _text(page, "main")
                # main 텍스트에서 날짜 패턴 추출
                date_m  = re.search(r"\d{4}년\s*\d{1,2}월\s*\d{1,2}일", content)
                date    = date_m.group(0) if date_m else ""

                if title or content:
                    records.append(_record("sokjima", href, title, date, content))
            except PWTimeout:
                log_warning("web_crawler", "_crawl_sokjima", f"상세 타임아웃: {href}")
            except Exception as e:
                log_error("web_crawler", "_crawl_sokjima", f"상세 오류: {href}", exc=e)

        if page_num >= MAX_PAGES:
            break

        # 다음 페이지 이동
        next_link = page.query_selector(f"a[href*='page={page_num + 1}']")
        if not next_link:
            break
        next_href = next_link.get_attribute("href") or ""
        next_full = next_href if next_href.startswith("http") else f"{BASE}{next_href}"
        try:
            page.goto(next_full, wait_until="domcontentloaded", timeout=LOAD_TIMEOUT)
            time.sleep(1)
        except Exception:
            break

    log_info("web_crawler", "_crawl_sokjima", f"완료: {len(records)}건")
    return records


# ─────────────────────────────────────────────────
# 2. msafer (API + Playwright 외부 URL)
# ─────────────────────────────────────────────────

def _crawl_msafer(page: Page) -> list[dict]:
    """msafer API로 목록 수집 → 외부 뉴스 URL Playwright 방문"""
    records: list[dict] = []

    try:
        resp = _requests.post(
            "https://www.msafer.or.kr/board_phishing/getPhishingList.do",
            json={"pageIndex": 1, "category": "L"},
            headers={
                "Content-Type": "application/json",
                "Referer": "https://www.msafer.or.kr/board_phishing/index.do",
                "User-Agent": BASE_UA,
            },
            timeout=10,
        )
        resp.raise_for_status()
        items = resp.json().get("list", [])
    except Exception as e:
        log_error("web_crawler", "_crawl_msafer", f"API 호출 실패: {e}", exc=e)
        return records

    for item in items[:MAX_ARTICLES]:
        ext_url = item.get("url") or ""
        title   = item.get("title") or ""
        date    = item.get("dtInsert") or ""

        if not ext_url:
            records.append(_record("msafer", "", title, date, ""))
            continue

        try:
            page.goto(ext_url, wait_until="domcontentloaded", timeout=LOAD_TIMEOUT)
            time.sleep(REQ_DELAY)

            # 한국 뉴스 사이트 공통 본문 셀렉터
            content = ""
            for sel in [
                "article", ".article-body", ".article_body", ".news-content",
                ".article_txt", ".newsct_article", ".view_content",
                "#articleBodyContents", ".article_view",
            ]:
                el = page.query_selector(sel)
                if el:
                    content = el.inner_text().strip()
                    break
            # fallback: p 태그 전체
            if not content:
                paras = page.query_selector_all("p")
                content = "\n".join(
                    p.inner_text().strip() for p in paras if len(p.inner_text().strip()) > 30
                )

            records.append(_record("msafer", ext_url, title, date, content))
        except PWTimeout:
            log_warning("web_crawler", "_crawl_msafer", f"외부 URL 타임아웃: {ext_url}")
            records.append(_record("msafer", ext_url, title, date, ""))
        except Exception as e:
            log_error("web_crawler", "_crawl_msafer", f"외부 URL 오류: {ext_url}", exc=e)
            records.append(_record("msafer", ext_url, title, date, ""))

    log_info("web_crawler", "_crawl_msafer", f"완료: {len(records)}건")
    return records


# ─────────────────────────────────────────────────
# 3. wiseuser
# ─────────────────────────────────────────────────

def _crawl_wiseuser(page: Page) -> list[dict]:
    """wiseuser — goEdit form POST 클릭 방식, GET pagination"""
    BASE     = "https://www.wiseuser.go.kr"
    LIST_TPL = f"{BASE}/edu_list.do?boardtypecode=5255&curpage={{page}}"
    records: list[dict] = []

    for page_num in range(1, MAX_PAGES + 1):
        list_url = LIST_TPL.format(page=page_num)
        try:
            page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
            time.sleep(1)
        except PWTimeout:
            log_warning("web_crawler", "_crawl_wiseuser", f"목록 타임아웃 (page={page_num})")
            break

        row_links = page.query_selector_all("table.notice_box tbody a")
        if not row_links:
            break

        for link in row_links[:MAX_ARTICLES]:
            try:
                # form POST 클릭으로 edu_view.do 이동
                with page.expect_navigation(timeout=10_000):
                    link.click()
                time.sleep(REQ_DELAY)

                view_url = page.url
                content  = _text(page, "#content-wrap")

                # content-wrap: 첫 줄 = 제목, 세 번째 줄 근처 = 날짜
                lines = [l.strip() for l in content.splitlines() if l.strip()]
                # "최신피해사례" 같은 breadcrumb 제외
                title_lines = [l for l in lines[:5] if len(l) > 5 and "피해사례" not in l and "슬기로운" not in l]
                title = title_lines[0] if title_lines else ""

                date_m = re.search(r"\d{4}-\d{2}-\d{2}", content)
                date   = date_m.group(0) if date_m else ""

                if title or content:
                    records.append(_record("wiseuser", view_url, title, date, content))

                # 목록으로 복귀
                page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
                time.sleep(1)

            except PWTimeout:
                log_warning("web_crawler", "_crawl_wiseuser", "상세 타임아웃 (클릭 후)")
                page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
                time.sleep(1)
            except Exception as e:
                log_error("web_crawler", "_crawl_wiseuser", f"상세 오류", exc=e)
                try:
                    page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
                    time.sleep(1)
                except Exception:
                    pass

    log_info("web_crawler", "_crawl_wiseuser", f"완료: {len(records)}건")
    return records


# ─────────────────────────────────────────────────
# 4. police (cyberbureau)
# ─────────────────────────────────────────────────

def _crawl_police(page: Page) -> list[dict]:
    """경찰청 사이버안전지킴이 피해경보발령 게시판"""
    BASE      = "https://cyberbureau.police.go.kr"
    LIST_BASE = f"{BASE}/board/boardList.do?board_id=warning&mid=020700"
    records: list[dict] = []

    for page_num in range(1, MAX_PAGES + 1):
        list_url = LIST_BASE if page_num == 1 else f"{LIST_BASE}&page={page_num}"
        try:
            page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
            time.sleep(1)
        except PWTimeout:
            log_warning("web_crawler", "_crawl_police", f"목록 타임아웃 (page={page_num})")
            break

        view_links = page.query_selector_all("a[href*='boardView.do']")
        if not view_links:
            break

        hrefs = []
        seen: set[str] = set()
        for link in view_links[:MAX_ARTICLES]:
            href = link.get_attribute("href") or ""
            full = href if href.startswith("http") else f"{BASE}{href}"
            if full not in seen:
                hrefs.append(full)
                seen.add(full)

        for href in hrefs:
            try:
                page.goto(href, wait_until="networkidle", timeout=LOAD_TIMEOUT)
                time.sleep(REQ_DELAY)

                # 제목: thead의 sj_line tr td
                title_el = page.query_selector(".bbs_view_wrap thead tr.sj_line td")
                title    = title_el.inner_text().strip() if title_el else _text(page, ".bbs_view_wrap")

                # 날짜: 등록일 th 다음 td
                date = ""
                header_tds = page.query_selector_all(".bbs_view_wrap thead td")
                for td in header_tds:
                    text = td.inner_text().strip()
                    if re.match(r"\d{4}-\d{2}-\d{2}", text):
                        date = text[:10]
                        break

                # 본문: .bbs_cont
                content = _text(page, ".bbs_cont")

                if title or content:
                    records.append(_record("police", href, title, date, content))
            except PWTimeout:
                log_warning("web_crawler", "_crawl_police", f"상세 타임아웃: {href}")
            except Exception as e:
                log_error("web_crawler", "_crawl_police", f"상세 오류: {href}", exc=e)

    log_info("web_crawler", "_crawl_police", f"완료: {len(records)}건")
    return records


# ─────────────────────────────────────────────────
# 5. kisa (보호나라 보안공지)
# ─────────────────────────────────────────────────

def _crawl_kisa(page: Page) -> list[dict]:
    """KISA 인터넷보호나라 보안공지"""
    BASE      = "https://www.boho.or.kr"
    LIST_BASE = f"{BASE}/kr/bbs/list.do?menuNo=205020&bbsId=B0000133"
    records: list[dict] = []

    for page_num in range(1, MAX_PAGES + 1):
        list_url = LIST_BASE if page_num == 1 else f"{LIST_BASE}&pageIndex={page_num}"
        try:
            page.goto(list_url, wait_until="networkidle", timeout=LOAD_TIMEOUT)
            time.sleep(1)
        except PWTimeout:
            log_warning("web_crawler", "_crawl_kisa", f"목록 타임아웃 (page={page_num})")
            break

        view_links = page.query_selector_all("a[href*='bbs/view.do']")
        if not view_links:
            break

        hrefs = []
        seen: set[str] = set()
        for link in view_links[:MAX_ARTICLES]:
            href = link.get_attribute("href") or ""
            full = href if href.startswith("http") else f"{BASE}{href}"
            if full not in seen:
                hrefs.append(full)
                seen.add(full)

        for href in hrefs:
            try:
                page.goto(href, wait_until="networkidle", timeout=LOAD_TIMEOUT)
                time.sleep(REQ_DELAY)

                # 제목: 페이지 타이틀에서 파싱 (사이트명 제거)
                raw_title = page.title()
                title = raw_title.split(" > ")[0].strip() if " > " in raw_title else raw_title

                # 날짜: .contents 에서 YYYY-MM-DD 추출
                contents_text = _text(page, ".contents")
                date_m = re.search(r"\d{4}-\d{2}-\d{2}", contents_text)
                date   = date_m.group(0) if date_m else ""

                # 본문: .content_html
                content = _text(page, ".content_html")

                if title or content:
                    records.append(_record("kisa", href, title, date, content))
            except PWTimeout:
                log_warning("web_crawler", "_crawl_kisa", f"상세 타임아웃: {href}")
            except Exception as e:
                log_error("web_crawler", "_crawl_kisa", f"상세 오류: {href}", exc=e)

    log_info("web_crawler", "_crawl_kisa", f"완료: {len(records)}건")
    return records


# ─────────────────────────────────────────────────
# 통합 실행
# ─────────────────────────────────────────────────

_CRAWLERS = {
    "sokjima":  _crawl_sokjima,
    "msafer":   _crawl_msafer,
    "wiseuser": _crawl_wiseuser,
    "police":   _crawl_police,
    "kisa":     _crawl_kisa,
}


def run_all_web_crawlers(sites: list[str] | None = None) -> dict:
    """모든 웹 크롤러 실행 → S3 저장.

    Args:
        sites: 실행할 사이트 키 리스트. None이면 전체 실행.

    Returns:
        {site_name: {"collected": N, "s3_path": "..."}, ...}
    """
    targets = sites or list(_CRAWLERS.keys())
    log_info("web_crawler", "run_all_web_crawlers", f"웹 크롤링 시작: {targets}")

    all_records: list[dict] = []
    result: dict = {}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=BASE_UA,
            locale="ko-KR",
            extra_http_headers={"Accept-Language": "ko-KR,ko;q=0.9"},
        )
        page = context.new_page()

        for site_key in targets:
            crawl_fn = _CRAWLERS.get(site_key)
            if crawl_fn is None:
                log_warning("web_crawler", "run_all_web_crawlers", f"알 수 없는 사이트: {site_key}")
                continue

            log_info("web_crawler", "run_all_web_crawlers", f"{site_key} 크롤링 시작")
            try:
                records = crawl_fn(page)
                all_records.extend(records)
                result[site_key] = {"collected": len(records)}
            except Exception as e:
                log_error("web_crawler", "run_all_web_crawlers", f"{site_key} 크롤링 실패", exc=e)
                result[site_key] = {"collected": 0, "error": str(e)}

        browser.close()

    s3_path = _save_to_s3(all_records) if all_records else None
    for key in result:
        result[key]["s3_path"] = s3_path

    log_info(
        "web_crawler", "run_all_web_crawlers",
        f"전체 완료: 총 {len(all_records)}건 / S3: {s3_path}",
    )
    return result


# ─────────────────────────────────────────────────
# 단독 실행
# ─────────────────────────────────────────────────

def main() -> None:
    print("=" * 50)
    print("웹 크롤러 (Playwright)")
    print("=" * 50)

    result = run_all_web_crawlers()

    print("\n결과:")
    for source, stats in result.items():
        err = f" / 오류: {stats['error']}" if "error" in stats else ""
        print(f"  {source}: {stats['collected']}건{err}")
    if result:
        s3 = next(iter(result.values())).get("s3_path")
        print(f"\nS3: {s3 or 'N/A'}")


if __name__ == "__main__":
    main()
