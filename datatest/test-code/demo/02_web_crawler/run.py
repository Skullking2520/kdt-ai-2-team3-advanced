"""데모 02 — 웹 크롤러 (Playwright → 한국 스미싱 게시판 → S3)

수집 사이트:
    sokjima   : https://sokjima.com/cases/
    msafer    : https://www.msafer.or.kr/board_phishing/
    wiseuser  : https://www.wiseuser.go.kr/edu_list.do
    police    : https://cyberbureau.police.go.kr/board/
    kisa      : https://www.boho.or.kr/kr/bbs/list.do

결과:
    S3 crawled/web/batch{N}.csv (100건씩 분할 저장)

실행:
    cd /path/to/test-code
    uv run python demo/02_web_crawler/run.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.web_crawler import run_all_web_crawlers

SITES = ["sokjima", "msafer", "wiseuser", "police", "kisa"]


def main():
    print("=" * 60)
    print("데모 02 — 웹 크롤러 (Playwright)")
    print("=" * 60)
    print()
    print("수집 대상:")
    for s in SITES:
        print(f"  - {s}")
    print()
    print("실행 사이트 선택 (전체 실행 시 약 15~20분 소요):")
    print("  1) sokjima만  (~2분)")
    print("  2) kisa만     (~2분)")
    print("  3) 전체 5개 사이트")
    choice = input("선택 [1/2/3]: ").strip()

    if choice == "1":
        sites = ["sokjima"]
    elif choice == "2":
        sites = ["kisa"]
    else:
        sites = None  # 전체

    print()
    print(f"크롤링 시작 (대상: {sites or '전체'})...")
    print()

    result = run_all_web_crawlers(sites=sites)

    print()
    print("[사이트별 결과]")
    for site, stats in result["sites"].items():
        err = f"  오류: {stats['error']}" if stats["error"] else ""
        print(f"  {site}: {stats['collected']}건{err}")

    print()
    print("[S3 저장 결과]")
    print(f"  신규: {result['saved']}건 / 중복: {result['duplicates']}건")
    for path in result["batches"]:
        print(f"  저장: {path}")
    if result["error"]:
        print(f"  오류: {result['error']}")

    print()
    print("완료.")


if __name__ == "__main__":
    main()
