"""크롤러 단독 테스트 (URLhaus Auth-Key 적용 확인).

실행:
    PYTHONPATH=. uv run python tests/test_crawler.py
"""

from pipeline.crawler import crawl_openphish, crawl_urlhaus


def test_urlhaus() -> None:
    print("\n" + "=" * 50)
    print("[Test] URLhaus 크롤링")
    print("=" * 50)

    urls = crawl_urlhaus(limit=20)

    print(f"  수집 건수: {len(urls)}건")
    if urls:
        print("\n  샘플 5건:")
        for u in urls[:5]:
            print(f"    [{u['category']}] {u['pattern_value']}")
        print("\n  [OK] URLhaus 크롤링 통과")
    else:
        print("  [FAIL] 0건 — Auth-Key 또는 네트워크 확인 필요")


def test_openphish() -> None:
    print("\n" + "=" * 50)
    print("[Test] OpenPhish 크롤링")
    print("=" * 50)

    urls = crawl_openphish()

    print(f"  수집 건수: {len(urls)}건")
    if urls:
        print("\n  샘플 5건:")
        for u in urls[:5]:
            print(f"    [{u['category']}] {u['pattern_value']}")
        print("\n  [OK] OpenPhish 크롤링 통과")
    else:
        print("  [FAIL] 0건 — 네트워크 확인 필요")


def main() -> None:
    print("=" * 50)
    print("크롤러 단독 테스트")
    print("=" * 50)

    test_urlhaus()
    test_openphish()


if __name__ == "__main__":
    main()