"""데모 03 — VirusTotal URL/도메인 조회

기능:
    - URL 또는 도메인 단건 조회
    - 한글 요약 출력 (위험등급, 탐지 엔진 수, 최초 등록일 등)
    - 일일 할당량 확인 (자동 400회 / 수동 100회)
    - 결과 S3 저장 + MySQL blacklist 갱신 (blacklist_id 제공 시)

주의:
    무료 플랜 — 분당 4회 제한 (15초 간격으로 자동 throttle)

실행:
    cd /path/to/test-code
    uv run python demo/03_virustotal/run.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from pipeline.virustotal_io import can_call, process_vt_result

DEMO_URL    = "http://malware.wicar.org/data/eicar.com"
DEMO_DOMAIN = "malware.wicar.org"


def main():
    print("=" * 60)
    print("데모 03 — VirusTotal 조회")
    print("=" * 60)
    print()

    ok_auto,   reason_auto   = can_call("auto")
    ok_manual, reason_manual = can_call("manual")
    print("오늘 할당량:")
    print(f"  자동   (스케줄러용): {'사용 가능' if ok_auto   else f'소진 — {reason_auto}'}")
    print(f"  수동   (사용자용):   {'사용 가능' if ok_manual else f'소진 — {reason_manual}'}")
    print()

    if not ok_manual:
        print("오늘 수동 할당량 소진. 내일 다시 시도하세요.")
        return

    print("조회 대상:")
    print(f"  1) 데모 URL    : {DEMO_URL}")
    print(f"  2) 데모 도메인 : {DEMO_DOMAIN}")
    print("  3) 직접 입력")
    choice = input("선택 [1/2/3]: ").strip()

    if choice == "2":
        ptype, pvalue = "domain", DEMO_DOMAIN
    elif choice == "3":
        ptype  = input("타입 입력 [url/domain]: ").strip()
        pvalue = input("값 입력: ").strip()
    else:
        ptype, pvalue = "url", DEMO_URL

    print()
    print(f"조회 중: [{ptype}] {pvalue}")
    print("(최초 조회 시 약 15초 소요 — 분당 4회 제한 throttle)")
    print()

    summary = process_vt_result(
        pattern_type=ptype,
        pattern_value=pvalue,
        mode="manual",
    )

    if summary is None:
        print("조회 실패 (할당량 소진 또는 API 오류)")
        return

    print("─" * 40)
    print("VT 조회 결과 (한글 요약)")
    print("─" * 40)
    for k, v in summary.items():
        if k == "탐지엔진":
            print(f"  {k}:")
            for engine in v[:5]:
                print(f"    - {engine['엔진']}: {engine['판정']}")
            if len(v) > 5:
                print(f"    ... 외 {len(v) - 5}개")
        elif k == "s3_path":
            print(f"  S3 저장 경로: {v}")
        else:
            print(f"  {k}: {v}")

    print()
    print("완료.")


if __name__ == "__main__":
    main()
