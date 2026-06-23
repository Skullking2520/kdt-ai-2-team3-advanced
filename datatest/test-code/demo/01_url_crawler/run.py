"""데모 01 — URL 크롤러 (OpenPhish + URLhaus → MySQL blacklist)

수집 소스:
    OpenPhish  : https://openphish.com/feed.txt (피싱 URL 피드)
    URLhaus    : https://urlhaus-api.abuse.ch/v1/urls/recent/ (악성 URL API)

결과:
    MySQL blacklist 테이블에 INSERT IGNORE (중복 자동 스킵)

실행:
    cd /path/to/test-code
    uv run python demo/01_url_crawler/run.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.crawler import crawl_openphish, crawl_urlhaus, run_all_crawlers


def main():
    print("=" * 60)
    print("데모 01 — URL 크롤러")
    print("=" * 60)
    print()

    # OpenPhish 수집 미리보기 (DB 저장 없이)
    print("[1/3] OpenPhish 피드 수집 중...")
    openphish_urls = crawl_openphish()
    print(f"      수집: {len(openphish_urls)}건")
    if openphish_urls:
        print("      샘플 (첫 3건):")
        for u in openphish_urls[:3]:
            print(f"        - {u['pattern_value']}")
    print()

    # URLhaus 수집 미리보기
    print("[2/3] URLhaus 수집 중 (최대 50건)...")
    urlhaus_urls = crawl_urlhaus(limit=50)
    print(f"      수집: {len(urlhaus_urls)}건")
    if urlhaus_urls:
        print("      샘플 (첫 3건):")
        for u in urlhaus_urls[:3]:
            print(f"        - [{u['category']}] {u['pattern_value']}")
    print()

    # MySQL INSERT 여부 확인
    ans = input("[3/3] MySQL blacklist에 실제 저장하시겠습니까? [y/N]: ").strip().lower()
    if ans == "y":
        print("      전체 크롤러 실행 중...")
        result = run_all_crawlers()
        print()
        print("      결과:")
        for source, stats in result.items():
            print(f"        {source}: 수집 {stats['collected']}건 / "
                  f"신규 {stats['inserted']}건 / 중복 {stats['skipped']}건")
    else:
        print("      저장 생략")

    print()
    print("완료.")


if __name__ == "__main__":
    main()
